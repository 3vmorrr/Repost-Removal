plugins {
    id("com.android.application")
}

android {
    namespace = "com.omar.repostremover.android"
    compileSdk = 36

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.omar.repostremover.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.0-alpha2"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.16.0")
}
