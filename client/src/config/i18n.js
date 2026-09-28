import { useThemeStore } from '../store/useThemeStore.js';

export const TRANSLATIONS = {
  EN: {
    // Navigation
    nav_dashboard: 'Dashboard',
    nav_test_sessions: 'Test Sessions',
    nav_instrument_models: 'Instrument Models',
    nav_manufacturers: 'Manufacturers',
    nav_laboratories: 'Laboratories',
    nav_test_procedures: 'Test Procedures',
    nav_rule_configs: 'OIML Rule Configs',
    nav_test_reports: 'Test Reports',
    nav_audit_trail: 'Audit Trail',
    nav_egov_export: 'e-Gov Export',
    nav_public_verification: 'Public Verification',
    nav_system_logs: 'Console & Logs',

    // Offline / PWA
    offline_mode: 'Offline Mode',
    online_mode: 'Online',
    pending_sync: 'Pending Sync',
    sync_now: 'Sync Now',
    syncing: 'Syncing...',
    offline_outbox_title: 'Offline Draft Outbox & Sync Queue',

    // Dashboard
    greeting_morning: 'Good Morning',
    greeting_afternoon: 'Good Afternoon',
    greeting_evening: 'Good Evening',
    exec_overview: 'NAWI Digital Metrology — Executive System Overview',
    mfr_portal: 'Manufacturer Portal — Type Approval & Evaluation Tracking',
    lab_portal: 'Laboratory Metrologist Portal',
    total_sessions: 'Total Sessions',
    reports_generated: 'Reports Generated',
    instruments_registered: 'Instruments Registered',
    manufacturers: 'Manufacturers',
    monthly_test_sessions: 'Monthly Test Sessions',
    session_status_breakdown: 'Session Status Breakdown',
    quick_actions: 'Quick Actions',
    new_test_session: '+ New Test Session',
    verify_report: 'Verify Report',
    audit_trail_action: 'Audit Trail',

    // Actions & Buttons
    btn_search: 'Search',
    btn_filter: 'Filter',
    btn_reset: 'Reset',
    btn_submit: 'Submit',
    btn_approve: 'Approve',
    btn_reject: 'Reject',
    btn_download_pdf: 'Download PDF',
    btn_download_docx: 'Download DOCX',
    btn_revoke: 'Revoke Report',
    btn_close: 'Close',
    btn_cancel: 'Cancel',

    // Statuses
    status_draft: 'Draft',
    status_submitted: 'Submitted',
    status_under_review: 'Under Review',
    status_passed: 'Passed',
    status_failed: 'Failed',
    status_integrity_tagged: 'Integrity Tagged',
    status_published: 'Published',
    status_revoked: 'Revoked',
    status_archived: 'Archived',
  },
  HI: {
    // Navigation
    nav_dashboard: 'डैशबोर्ड',
    nav_test_sessions: 'परीक्षण सत्र (Test Sessions)',
    nav_instrument_models: 'उपकरण मॉडल (Instrument Models)',
    nav_manufacturers: 'निर्माता (Manufacturers)',
    nav_laboratories: 'प्रयोगशालाएँ (Laboratories)',
    nav_test_procedures: 'परीक्षण प्रक्रियाएं (Test Procedures)',
    nav_rule_configs: 'OIML नियम विन्यास (Rule Configs)',
    nav_test_reports: 'परीक्षण रिपोर्ट (Test Reports)',
    nav_audit_trail: 'ऑडिट ट्रेल (Audit Trail)',
    nav_egov_export: 'ई-गवर्नेंस निर्यात (Export)',
    nav_public_verification: 'सार्वजनिक सत्यापन (Verification)',
    nav_system_logs: 'सिस्टम कंसोल और लॉग',

    // Offline / PWA
    offline_mode: 'ऑफ़लाइन मोड',
    online_mode: 'ऑनलाइन',
    pending_sync: 'सिंक लंबित (Pending)',
    sync_now: 'अभी सिंक करें',
    syncing: 'सिंक हो रहा है...',
    offline_outbox_title: 'ऑफ़लाइन ड्राफ्ट और सिंक कतार',

    // Dashboard
    greeting_morning: 'सुप्रभात',
    greeting_afternoon: 'नमस्कार',
    greeting_evening: 'शुभ संध्या',
    exec_overview: 'NAWI डिजिटल मापविज्ञान प्रणाली — कार्यकारी अवलोकन',
    mfr_portal: 'निर्माता पोर्टल — मॉडल अनुमोदन एवं मूल्यांकन ट्रैकिंग',
    lab_portal: 'प्रयोगशाला मापविज्ञानी पोर्टल',
    total_sessions: 'कुल परीक्षण सत्र',
    reports_generated: 'जारी की गई रिपोर्ट',
    instruments_registered: 'पंजीकृत उपकरण मॉडल',
    manufacturers: 'कुल निर्माता',
    monthly_test_sessions: 'मासिक परीक्षण सत्र',
    session_status_breakdown: 'सत्र स्थिति विश्लेषण',
    quick_actions: 'त्वरित कार्रवाई (Quick Actions)',
    new_test_session: '+ नया परीक्षण सत्र',
    verify_report: 'रिपोर्ट सत्यापित करें',
    audit_trail_action: 'ऑडिट ट्रेल देखें',

    // Actions & Buttons
    btn_search: 'खोजें',
    btn_filter: 'फ़िल्टर करें',
    btn_reset: 'रीसेट करें',
    btn_submit: 'प्रस्तुत करें (Submit)',
    btn_approve: 'स्वीकृत करें (Approve)',
    btn_reject: 'अस्वीकृत करें (Reject)',
    btn_download_pdf: 'PDF डाउनलोड करें',
    btn_download_docx: 'DOCX डाउनलोड करें',
    btn_revoke: 'रिपोर्ट रद्द करें (Revoke)',
    btn_close: 'बंद करें',
    btn_cancel: 'रद्द करें',

    // Statuses
    status_draft: 'प्रारूप (Draft)',
    status_submitted: 'प्रस्तुत (Submitted)',
    status_under_review: 'समीक्षाधीन (Under Review)',
    status_passed: 'उत्तीर्ण (Passed)',
    status_failed: 'अनुत्तीर्ण (Failed)',
    status_integrity_tagged: 'सत्यापित (Integrity Tagged)',
    status_published: 'प्रकाशित (Published)',
    status_revoked: 'रद्द (Revoked)',
    status_archived: 'अभिलेखागार (Archived)',
  },
};

export function useTranslation() {
  const language = useThemeStore((s) => s.language);

  const t = (key, fallback = '') => {
    const langDict = TRANSLATIONS[language] || TRANSLATIONS.EN;
    return langDict[key] || TRANSLATIONS.EN[key] || fallback || key;
  };

  return { t, language };
}
