import type { LocalePreference } from './preferences';

type Copy = Record<string, string>;

const en: Copy = {
  appName: 'Repost Remover', ready: 'Ready to scan', localMode: 'Local mode · this browser only', telegramMode: 'Telegram mode · browser required',
  totalsLabel: 'Repost totals', scanDetailsLabel: 'Scan details', reviewControlsLabel: 'Review controls', pagesLabel: 'Repost pages',
  account: 'TikTok account', accountUnknown: 'Not checked', accountIdle: 'Sign in to TikTok in this browser, then check account status.', accountConnected: 'Profile found', checkAccount: 'Check account', accountChecking: 'Checking the open TikTok tab…',
  accountDetected: 'TikTok profile detected. This does not guarantee a scan will work.', accountNoTab: 'Open TikTok in this browser, then check again.',
  accountMissing: 'No profile detected. Sign in on TikTok and complete any challenge manually.', accountError: 'Could not inspect TikTok. Refresh the tab and try again.',
  scan: 'Scan reposts', stopScan: 'Stop scan', review: 'Review reposts', settings: 'Settings', collected: 'Found', selected: 'Selected', removed: 'Removed', failed: 'Failed', remaining: 'Remaining',
  pages: 'Pages', pageSize: 'Page size', elapsed: 'Elapsed', scanIdle: 'Scan not started', scanComplete: 'Scan complete', partialScan: 'Partial scan saved',
  scanPacing: 'Next page in 4–8 seconds. TikTok does not provide a reliable total-page estimate.', safetyNote: 'Requests are paced carefully. TikTok can still restrict or challenge activity.',
  reviewTitle: 'Review reposts', loading: 'Loading…', deleteSelected: 'Remove selected', eta: 'Est. time', searchPlaceholder: 'Search creator, caption, or video ID', searchLabel: 'Search reposts',
  selectAll: 'Select all', selectNone: 'Select none', invert: 'Invert selection', pause: 'Pause', resume: 'Resume', stop: 'Stop', retry: 'Retry remaining',
  exportJson: 'Export JSON', exportCsv: 'Export CSV', noReposts: 'No reposts yet. Start a scan from the extension popup.', noMatches: 'No reposts match your search.', noCaption: 'No caption',
  previous: 'Previous', next: 'Next', pageOf: 'Page {page} of {pages} · {count} items', onlyChecked: 'Only selected reposts will be removed. TikTok may throttle or refuse requests.',
  deleteConfirm: 'Remove exactly {count} selected repost(s)? Only selected items will be changed.', retryConfirm: 'Retry {count} selected remaining repost(s)?',
  preferences: 'Preferences', theme: 'Theme', systemTheme: 'Use device setting', lightTheme: 'Light', darkTheme: 'Dark', language: 'Language', english: 'English', arabic: 'العربية',
  mode: 'Operating mode', localModeName: 'Local mode', telegramModeName: 'Telegram paired mode', localModeHelp: 'Scan and remove from this signed-in browser. Repost data stays on this device.',
  telegramModeHelp: 'The bot can request scans and removals while this browser and a signed-in TikTok tab are available.',
  telegramPairing: 'Telegram pairing', pairingIntro: 'Pairing is optional. It lets Telegram send tasks to this browser; TikTok login and requests remain in your browser.',
  workerUrl: 'Worker URL', pairCode: 'One-time pairing code', pairCodePlaceholder: '12 hexadecimal characters', pair: 'Pair with Telegram', disconnect: 'Disconnect pairing',
  connected: 'Extension paired with Telegram.', notConnected: 'Not paired. Local mode is ready to use.', quota: 'Today: {attempts}/{limit} removal attempts · {success} succeeded',
  pairingSuccess: 'Paired. Switch to Telegram and send /scan to the bot.', pairingInvalid: 'The pairing code is invalid. Request a new one with /connect.',
  pairingExpired: 'The code expired. Request a fresh code with /connect.', pairingApproval: 'Approve the Telegram account first, then request a fresh code with /connect.', pairingUsed: 'This code has already been used. Request another with /connect.',
  workerError: 'Could not reach the Worker. Check the URL and try again.', enterWorker: 'Enter a valid HTTPS workers.dev URL.', enterCode: 'Enter the 12-character code sent by the bot.',
  permissionDenied: 'Allow this extension to contact the Worker URL you entered.', pairingPending: 'Wait for admin approval in Telegram, then send /connect again.',
  helpPrivacy: 'Help & privacy', standaloneHelp: 'Local mode works without Telegram. Sign in to TikTok in this browser, scan, review, then confirm the items to remove.',
  telegramHelp: 'For Telegram mode, send /connect to @RepostReomve_bot and enter the temporary code here. Keep this browser and a TikTok tab open while tasks run.',
  tiktokWarning: 'TikTok may change or refuse its private interface. The extension cannot bypass login challenges; removals are not guaranteed.',
  contact: 'Contact', clearData: 'Clear local scan data', clearDataHelp: 'Clearing removes this browser’s saved repost list and run counters. It does not change TikTok or Telegram data.',
  clearConfirm: 'Clear the locally saved repost list and run counters?', stopBeforeClear: 'Stop the active task before clearing local data.', localDataCleared: 'Local scan data cleared.',
  modeRequiresPairing: 'Pair with Telegram first to use Telegram mode.', modeSwitchDuringTask: 'Stop the active task before switching modes.', disconnected: 'Pairing disconnected from this browser.',
  pageSizeReturned: '{count} returned', pageCursor: 'cursor {cursor}', seconds: '{count}s', minutes: '{minutes}m {seconds}s', hours: '{hours}h {minutes}m',
  statusPending: 'Selected', statusReady: 'Ready', statusRemoving: 'Removing', statusRemoved: 'Removed', statusFailed: 'Failed', statusRemaining: 'Still reposted',
  confirmNewScan: 'Start a new scan and replace the current repost list?', commandFailed: 'Extension command failed.', selectAtLeastOne: 'Select at least one repost that has not already been removed.',
  localOnly: 'Local mode is active. Switch to Telegram mode to run tasks requested by the bot.',
  scanStarted: 'Starting repost scan…', scanStartedTelegram: 'Starting repost scan from Telegram…', scanStopped: 'Scan stopped; collected reposts are ready to review.',
  deleteStopped: 'Deletion stopped; progress is saved.', deleteResuming: 'Resuming deletion…', verifyPreparing: 'Preparing verification…',
  deleteVerified: 'Deletion complete and verified.', deleteRemaining: 'Deletion finished with items still remaining.', stillPresent: 'Still present after server verification.',
};

const ar: Copy = {
  appName: 'إزالة إعادة النشر', ready: 'جاهز للفحص', localMode: 'الوضع المحلي · هذا المتصفح فقط', telegramMode: 'وضع تيليجرام · يحتاج المتصفح',
  totalsLabel: 'إحصاءات إعادة النشر', scanDetailsLabel: 'تفاصيل الفحص', reviewControlsLabel: 'أدوات المراجعة', pagesLabel: 'صفحات المقاطع',
  account: 'حساب تيك توك', accountUnknown: 'لم يتم التحقق', accountIdle: 'سجّل دخولك إلى تيك توك من هذا المتصفح، ثم تحقّق من الحساب.', accountConnected: 'تم العثور على الحساب', checkAccount: 'التحقق من الحساب', accountChecking: 'جارٍ التحقق من صفحة تيك توك المفتوحة…',
  accountDetected: 'تم العثور على ملف تيك توك. هذا لا يضمن نجاح الفحص.', accountNoTab: 'افتح تيك توك في هذا المتصفح ثم أعد التحقق.',
  accountMissing: 'لم يتم العثور على ملفك. سجّل الدخول إلى تيك توك وأكمل أي تحقق يدويًا.', accountError: 'تعذر فحص تيك توك. حدّث الصفحة وحاول مرة أخرى.',
  scan: 'فحص إعادة النشر', stopScan: 'إيقاف الفحص', review: 'مراجعة المقاطع', settings: 'الإعدادات', collected: 'المعثر عليها', selected: 'المحددة', removed: 'تمت إزالتها', failed: 'فشل', remaining: 'متبقية',
  pages: 'الصفحات', pageSize: 'حجم الصفحة', elapsed: 'المدة', scanIdle: 'لم يبدأ الفحص', scanComplete: 'اكتمل الفحص', partialScan: 'تم حفظ نتائج الفحص الجزئية',
  scanPacing: 'الصفحة التالية خلال ٤–٨ ثوانٍ. لا يحدد تيك توك عدد الصفحات مسبقًا.', safetyNote: 'نرسل الطلبات بهدوء، لكن قد يفرض تيك توك قيودًا أو يطلب التحقق.',
  reviewTitle: 'مراجعة المقاطع', loading: 'جارٍ التحميل…', deleteSelected: 'إزالة المحدد', eta: 'الوقت المتوقع', searchPlaceholder: 'ابحث باسم الحساب أو الوصف أو رقم المقطع', searchLabel: 'البحث في المقاطع',
  selectAll: 'تحديد الكل', selectNone: 'إلغاء التحديد', invert: 'عكس التحديد', pause: 'إيقاف مؤقت', resume: 'استئناف', stop: 'إيقاف', retry: 'إعادة المحاولة',
  exportJson: 'تصدير JSON', exportCsv: 'تصدير CSV', noReposts: 'لا توجد مقاطع بعد. ابدأ الفحص من نافذة الإضافة.', noMatches: 'لا توجد مقاطع تطابق البحث.', noCaption: 'بدون وصف',
  previous: 'السابق', next: 'التالي', pageOf: 'صفحة {page} من {pages} · {count} مقطع', onlyChecked: 'ستتم إزالة المقاطع المحددة فقط. قد يبطئ تيك توك الطلبات أو يرفضها.',
  deleteConfirm: 'هل تريد إزالة {count} مقطع محدد؟ لن يتغير إلا ما حددته.', retryConfirm: 'إعادة محاولة إزالة {count} مقطع متبقٍ محدد؟',
  preferences: 'التفضيلات', theme: 'المظهر', systemTheme: 'حسب إعداد الجهاز', lightTheme: 'فاتح', darkTheme: 'داكن', language: 'اللغة', english: 'English', arabic: 'العربية',
  mode: 'طريقة الاستخدام', localModeName: 'الوضع المحلي', telegramModeName: 'وضع تيليجرام المرتبط', localModeHelp: 'افحص وأزل من المتصفح المسجل عليه. تبقى بيانات المقاطع على جهازك.',
  telegramModeHelp: 'يستطيع البوت إرسال مهام لهذا المتصفح عند توفره ووجود صفحة تيك توك مسجل عليها.',
  telegramPairing: 'ربط تيليجرام', pairingIntro: 'الربط اختياري. يسمح لتيليجرام بإرسال المهام لهذا المتصفح؛ تسجيل الدخول وطلبات تيك توك تظل على جهازك.',
  workerUrl: 'رابط Worker', pairCode: 'رمز الربط لمرة واحدة', pairCodePlaceholder: '١٢ خانة من الأحرف والأرقام السداسية', pair: 'الربط بتيليجرام', disconnect: 'فصل الربط',
  connected: 'الإضافة مرتبطة بتيليجرام.', notConnected: 'غير مرتبط. الوضع المحلي جاهز.', quota: 'اليوم: {attempts}/{limit} محاولة إزالة · نجح {success}',
  pairingSuccess: 'تم الربط. ارجع إلى تيليجرام وأرسل /scan للبوت.', pairingInvalid: 'رمز الربط غير صالح. اطلب رمزًا جديدًا باستخدام /connect.',
  pairingExpired: 'انتهت صلاحية الرمز. اطلب رمزًا جديدًا باستخدام /connect.', pairingApproval: 'يجب أن توافق الإدارة على حساب تيليجرام أولًا، ثم اطلب رمزًا جديدًا باستخدام /connect.', pairingUsed: 'استُخدم هذا الرمز من قبل. اطلب رمزًا آخر باستخدام /connect.',
  workerError: 'تعذر الاتصال بـ Worker. تحقق من الرابط وحاول مرة أخرى.', enterWorker: 'أدخل رابط HTTPS صالحًا من workers.dev.', enterCode: 'أدخل الرمز المكوّن من ١٢ خانة الذي أرسله البوت.',
  permissionDenied: 'اسمح للإضافة بالاتصال برابط Worker الذي أدخلته.', pairingPending: 'انتظر موافقة الإدارة في تيليجرام، ثم أرسل /connect مرة أخرى.',
  helpPrivacy: 'المساعدة والخصوصية', standaloneHelp: 'يعمل الوضع المحلي دون تيليجرام. سجّل دخولك إلى تيك توك من هذا المتصفح، ثم افحص وراجع وأكّد المقاطع المطلوبة.',
  telegramHelp: 'لتفعيل وضع تيليجرام، أرسل /connect إلى @RepostReomve_bot وأدخل الرمز المؤقت هنا. اترك المتصفح وصفحة تيك توك مفتوحين أثناء المهمة.',
  tiktokWarning: 'قد تتغير واجهة تيك توك أو ترفض الطلبات. لا تتجاوز الإضافة تحديات تسجيل الدخول، ولا نضمن نجاح الإزالة.',
  contact: 'التواصل', clearData: 'مسح بيانات الفحص المحلية', clearDataHelp: 'يمسح قائمة المقاطع المحفوظة وسجل التشغيل من هذا المتصفح فقط، ولا يغير بيانات تيك توك أو تيليجرام.',
  clearConfirm: 'هل تريد مسح قائمة المقاطع المحفوظة وسجل التشغيل؟', stopBeforeClear: 'أوقف المهمة الحالية قبل مسح البيانات المحلية.', localDataCleared: 'تم مسح بيانات الفحص المحلية.',
  modeRequiresPairing: 'اربط الإضافة بتيليجرام أولًا لاستخدام هذا الوضع.', modeSwitchDuringTask: 'أوقف المهمة الحالية قبل تغيير الوضع.', disconnected: 'تم فصل الربط عن هذا المتصفح.',
  pageSizeReturned: 'تم استلام {count}', pageCursor: 'المؤشر {cursor}', seconds: '{count} ث', minutes: '{minutes} د {seconds} ث', hours: '{hours} س {minutes} د',
  statusPending: 'محدد', statusReady: 'جاهز', statusRemoving: 'جارٍ الإزالة', statusRemoved: 'تمت الإزالة', statusFailed: 'فشل', statusRemaining: 'ما زال معاد نشره',
  confirmNewScan: 'بدء فحص جديد واستبدال القائمة الحالية؟', commandFailed: 'تعذر تنفيذ أمر الإضافة.', selectAtLeastOne: 'حدد مقطعًا واحدًا على الأقل لم تتم إزالته.',
  localOnly: 'الوضع المحلي مفعل. بدّل إلى وضع تيليجرام لتنفيذ مهام البوت.',
  scanStarted: 'جارٍ بدء فحص إعادة النشر…', scanStartedTelegram: 'جارٍ بدء الفحص بطلب من تيليجرام…', scanStopped: 'توقف الفحص. يمكنك مراجعة المقاطع التي تم جمعها.',
  deleteStopped: 'توقفت الإزالة وتم حفظ التقدم.', deleteResuming: 'جارٍ استئناف الإزالة…', verifyPreparing: 'جارٍ تجهيز التحقق من النتائج…',
  deleteVerified: 'اكتملت الإزالة وتم التحقق من النتيجة.', deleteRemaining: 'انتهت الإزالة، وما زالت بعض المقاطع موجودة.', stillPresent: 'ما زال المقطع ظاهرًا بعد التحقق.',
};

const dictionaries: Record<LocalePreference, Copy> = { en, ar };

export function t(key: string, values: Record<string, string | number> = {}, locale?: LocalePreference): string {
  const language = locale ?? (document.documentElement.lang === 'ar' ? 'ar' : 'en');
  let result = dictionaries[language][key] ?? en[key] ?? key;
  for (const [name, value] of Object.entries(values)) result = result.replaceAll(`{${name}}`, String(value));
  return result;
}

export function localizeMessage(message: string): string {
  if (document.documentElement.lang !== 'ar') {
    const arabicKey = Object.entries(ar).find(([, value]) => value === message)?.[0];
    if (arabicKey) return t(arabicKey, {}, 'en');
  }
  const exact: Record<string, string> = {
    'Starting repost scan…': 'scanStarted', 'Starting repost scan from Telegram…': 'scanStartedTelegram', 'Scan complete': 'scanComplete', 'Scan not started': 'scanIdle',
    'Partial scan saved': 'partialScan', 'Deletion paused': 'pause', 'Deleting': 'deleteSelected',
    'Repost removed': 'statusRemoved', 'Item failed; continuing…': 'statusFailed',
    'Scan stopped; collected reposts are ready to review.': 'scanStopped', 'Deletion stopped; progress is saved.': 'deleteStopped',
    'Resuming deletion…': 'deleteResuming', 'Preparing verification…': 'verifyPreparing',
    'Deletion complete and verified.': 'deleteVerified', 'Deletion finished with items still remaining.': 'deleteRemaining',
    'Still present after server verification.': 'stillPresent',
    'Selection is locked while deletion is active.': 'modeSwitchDuringTask',
    'There is no paused deletion to resume.': 'modeSwitchDuringTask',
    'Select at least one repost that has not been removed.': 'selectAtLeastOne',
  };
  const key = exact[message];
  if (key) return t(key);
  if (document.documentElement.lang === 'ar') {
    const progress = message.match(/^Collected (\d+) reposts from (\d+) pages\.$/);
    if (progress) return `تم جمع ${progress[1]} مقطعًا من ${progress[2]} صفحة.`;
    const complete = message.match(/^Scan complete: (\d+) reposts collected\.$/);
    if (complete) return `اكتمل الفحص: تم جمع ${complete[1]} مقطعًا.`;
    const deleting = message.match(/^Deleting (\d+) selected reposts…$/);
    if (deleting) return `جارٍ إزالة ${deleting[1]} مقطع محدد…`;
    const removing = message.match(/^Removing (\d+)…$/);
    if (removing) return `جارٍ إزالة المقطع ${removing[1]}…`;
    const verifying = message.match(/^Verifying page (\d+) of at most (\d+)… (\d+) reposts checked$/);
    if (verifying) return `جارٍ التحقق من الصفحة ${verifying[1]} من أصل ${verifying[2]} كحد أقصى… تم فحص ${verifying[3]} مقطعًا.`;
    if (/^TikTok returned (401|403|429)\./.test(message)) return 'أوقفنا العملية بعد رفض تيك توك للطلب. أكمل أي تحقق وانتظر قبل المحاولة مجددًا.';
  }
  return message;
}

export function applyLocalization(locale: LocalePreference): void {
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const key = element.dataset.i18n;
    if (key) element.textContent = t(key, {}, locale);
  }
  for (const element of document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]')) {
    const key = element.dataset.i18nPlaceholder;
    if (key) element.placeholder = t(key, {}, locale);
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]')) {
    const key = element.dataset.i18nAriaLabel;
    if (key) {
      const label = t(key, {}, locale);
      element.setAttribute('aria-label', label);
      if (element.hasAttribute('title')) element.title = label;
    }
  }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n-title]')) {
    const key = element.dataset.i18nTitle;
    if (key) element.title = t(key, {}, locale);
  }
  const ariaCopy: Record<string, string> = {
    'Operating mode': 'mode', 'Repost totals': 'totalsLabel', 'Deletion totals': 'totalsLabel',
    'Scan details': 'scanDetailsLabel', 'Review controls': 'reviewControlsLabel', 'Repost pages': 'pagesLabel',
  };
  for (const element of document.querySelectorAll<HTMLElement>('[aria-label]')) {
    const key = ariaCopy[element.getAttribute('aria-label') ?? ''];
    if (key) element.setAttribute('aria-label', t(key, {}, locale));
  }
  document.title = t(document.title === 'Review TikTok Reposts' ? 'reviewTitle' : 'appName', {}, locale);
}
