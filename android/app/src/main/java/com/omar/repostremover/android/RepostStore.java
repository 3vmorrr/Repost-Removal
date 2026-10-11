package com.omar.repostremover.android;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

final class RepostStore extends SQLiteOpenHelper {
    RepostStore(Context context) {
        super(context, "repost-remover.sqlite", null, 1);
        setWriteAheadLoggingEnabled(true);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
        db.execSQL("CREATE TABLE reposts (id TEXT PRIMARY KEY, creator TEXT NOT NULL, description TEXT NOT NULL, thumbnail TEXT NOT NULL, url TEXT NOT NULL, selected INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', error TEXT NOT NULL DEFAULT '', scan_page INTEGER NOT NULL DEFAULT 1)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        // Versioned migrations are added here before changing the local schema.
    }

    synchronized String setting(String key, String fallback) {
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT value FROM settings WHERE key=?", new String[]{key})) {
            return cursor.moveToFirst() ? cursor.getString(0) : fallback;
        }
    }

    synchronized void setSetting(String key, String value) {
        ContentValues row = new ContentValues();
        row.put("key", key);
        row.put("value", value);
        getWritableDatabase().insertWithOnConflict("settings", null, row, SQLiteDatabase.CONFLICT_REPLACE);
    }

    synchronized JSONArray items() throws JSONException {
        JSONArray result = new JSONArray();
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT id,creator,description,thumbnail,url,selected,status,error,scan_page FROM reposts ORDER BY rowid DESC", null)) {
            while (cursor.moveToNext()) {
                JSONObject item = new JSONObject();
                item.put("id", cursor.getString(0));
                item.put("creator", cursor.getString(1));
                item.put("description", cursor.getString(2));
                item.put("thumbnail", cursor.getString(3));
                item.put("url", cursor.getString(4));
                item.put("selected", cursor.getInt(5) != 0);
                item.put("status", cursor.getString(6));
                item.put("error", cursor.getString(7));
                item.put("scan_page", cursor.getInt(8));
                result.put(item);
            }
        }
        return result;
    }

    synchronized JSONArray pendingSelected() throws JSONException {
        JSONArray result = new JSONArray();
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT id,creator,description,thumbnail,url,selected,status,error,scan_page FROM reposts WHERE selected=1 AND status IN ('pending','failed','remaining') ORDER BY rowid", null)) {
            while (cursor.moveToNext()) {
                JSONObject item = new JSONObject();
                item.put("id", cursor.getString(0));
                item.put("creator", cursor.getString(1));
                item.put("description", cursor.getString(2));
                item.put("thumbnail", cursor.getString(3));
                item.put("url", cursor.getString(4));
                item.put("selected", cursor.getInt(5) != 0);
                item.put("status", cursor.getString(6));
                item.put("error", cursor.getString(7));
                item.put("scan_page", cursor.getInt(8));
                result.put(item);
            }
        }
        return result;
    }

    synchronized void replaceScanResults(JSONArray rows, int page) throws JSONException {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            for (int i = 0; i < rows.length(); i++) {
                JSONObject item = rows.getJSONObject(i);
                ContentValues values = new ContentValues();
                values.put("id", item.getString("id"));
                values.put("creator", item.getString("creator"));
                values.put("description", item.optString("description"));
                values.put("thumbnail", item.optString("thumbnail"));
                values.put("url", item.getString("url"));
                values.put("scan_page", page);
                db.insertWithOnConflict("reposts", null, values, SQLiteDatabase.CONFLICT_IGNORE);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    synchronized int itemCount() {
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM reposts", null)) {
            return cursor.moveToFirst() ? cursor.getInt(0) : 0;
        }
    }

    synchronized int maxScanPage(JSONArray ids) throws JSONException {
        int max = 0;
        SQLiteDatabase db = getReadableDatabase();
        final int chunkSize = 500;
        for (int offset = 0; offset < ids.length(); offset += chunkSize) {
            int count = Math.min(chunkSize, ids.length() - offset);
            StringBuilder placeholders = new StringBuilder();
            String[] arguments = new String[count];
            for (int index = 0; index < count; index++) {
                if (index > 0) placeholders.append(',');
                placeholders.append('?');
                arguments[index] = ids.getString(offset + index);
            }
            try (Cursor cursor = db.rawQuery("SELECT COALESCE(MAX(scan_page),0) FROM reposts WHERE id IN (" + placeholders + ")", arguments)) {
                if (cursor.moveToFirst()) max = Math.max(max, cursor.getInt(0));
            }
        }
        return max;
    }

    synchronized void clearResults() {
        getWritableDatabase().delete("reposts", null, null);
    }

    synchronized void setSelected(String id, boolean selected) {
        ContentValues values = new ContentValues();
        values.put("selected", selected ? 1 : 0);
        getWritableDatabase().update("reposts", values, "id=?", new String[]{id});
    }

    synchronized void selectAll(boolean selected) {
        getWritableDatabase().execSQL("UPDATE reposts SET selected=? WHERE status!='removed'", new Object[]{selected ? 1 : 0});
    }

    synchronized void updateStatus(String id, String status, String error) {
        ContentValues values = new ContentValues();
        values.put("status", status);
        values.put("error", error == null ? "" : error);
        getWritableDatabase().update("reposts", values, "id=?", new String[]{id});
    }

    synchronized void clearResultsSecurely() {
        SQLiteDatabase db = getWritableDatabase();
        try (Cursor secureDelete = db.rawQuery("PRAGMA secure_delete=ON", null)) {
            if (secureDelete.moveToFirst()) { /* Consume the PRAGMA result. */ }
        }
        db.delete("reposts", null, null);
        try (Cursor ignored = db.rawQuery("PRAGMA wal_checkpoint(TRUNCATE)", null)) {
            if (ignored.moveToFirst()) { /* Consume the checkpoint result. */ }
        }
        db.execSQL("VACUUM");
    }
}
