const express = require('express');
const { chromium } = require('playwright'); // استيراد chromium من playwright
const cors = require('cors'); // استيراد CORS للتعامل مع الطلبات من نطاق مختلف
const bodyParser = require('body-parser'); // لتحليل جسم الطلب (JSON)
const { v4: uuidv4 } = require('uuid'); // أضف هذا السطر مع الـ require الأخرى
const crypto = require('crypto'); // أضف هذا السطر مع الـ require الأخرى


const app = express();
const fetch = require('node-fetch');

async function sendFacebookApiEvent(eventName, userData, customData, eventId) {
    const PIXEL_ID = process.env.PIXEL_ID;
    const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

    if (!PIXEL_ID || !ACCESS_TOKEN) {
        console.error("Facebook Pixel ID or Access Token is not set in environment variables.");
        return;
    }
    const hashedUserData = {};
    if (userData.email) {
        hashedUserData.em = [crypto.createHash('sha256').update(userData.email.toLowerCase()).digest('hex')];
    }
    if (userData.phone) {
        const cleanedPhone = userData.phone.replace(/\D/g, '');
        hashedUserData.ph = [crypto.createHash('sha256').update(cleanedPhone).digest('hex')];
    }
    const payload = {
        data: [{
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: 'website',
            event_id: eventId || crypto.randomUUID(),
            user_data: hashedUserData,
            custom_data: customData,
        }],
        test_event_code: 'TEST78353',
    };
    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('Facebook CAPI Error:', responseData);
        } else {
            console.log(`Successfully sent '${eventName}' event to Facebook CAPI.`);
        }
    } catch (error) {
        console.error('Failed to send event to Facebook CAPI:', error);
    }
}
const port = process.env.PORT;
const pendingSessions = {}; //  <-- أضف هذا الكائن لتخزين الجلسات
const appsScriptUrl = process.env.APPS_SCRIPT_URL;
if (!appsScriptUrl) {
    throw new Error("APPS_SCRIPT_URL environment variable is not set.");
}

app.use(cors());




// ** يجب تعريف TRANSLATIONS مرة واحدة فقط **
const TRANSLATIONS = {
    en: {
        'Career Objective': 'Career Objective',
        'Work Experience': 'Work Experience',
        'Education': 'Education',
        'Skills': 'Skills',
        'Languages': 'Languages',
        'References': 'References',
        'No Title': 'No Title',
        'No Degree': 'No Degree',
        'No Name': 'No Name',
        'ONLY PREVIEW': 'ONLY PREVIEW',
        'Profile Picture': 'Profile Picture',
        'Your Professional CV from Resail': 'Your Professional CV from Resail',
        'Please find your professional CV attached.': 'Please find your professional CV attached.',
        'CV generated successfully and sent!': 'CV generated successfully and sent to your email!'
    },
    ar: {
        'Career Objective': 'الهدف الوظيفي',
        'Work Experience': 'الخبرة العملية',
        'Education': 'المؤهلات العلمية',
        'Skills': 'المهارات',
        'Languages': 'اللغات',
        'References': 'المراجع',
        'No Title': 'بدون مسمى',
        'No Degree': 'بدون شهادة',
        'No Name': 'بدون اسم',
        'ONLY PREVIEW': 'للعرض فقط',
        'Profile Picture': 'الصورة الشخصية',
        'Your Professional CV from Resail': 'سيرتك الذاتية الاحترافية من رسائل',
        'Please find your professional CV attached.': 'تجد مرفقًا سيرتك الذاتية الاحترافية.',
        'CV generated successfully and sent!': 'تم إنشاء السيرة الذاتية بنجاح وإرسالها لبريدك الإلكتروني!'
    }
};

function getTranslation(lang, key) {
  return TRANSLATIONS[lang] && TRANSLATIONS[lang][key] ? TRANSLATIONS[lang][key] : key;
}

// **محتوى ملف style.css بالكامل مضمن هنا (كـ CSS_BASE_CONTENT)**
const CSS_BASE_CONTENT = `
/* General styles */
body {
    font-family: "Tajawal", Arial, sans-serif;
    background-color: #f7f9fc;
    color: #333;
    margin: 0;
    padding: 0;
    direction: rtl; 
    text-align: right; 
    overflow-y: auto; 
    padding-top: 40px; /* <<< هذا السطر هو الإضافة المهمة */
}

/* Language direction classes */
.rtl {
    direction: rtl;
    text-align: right;
    font-family: "Tajawal", sans-serif;
}

.ltr {
    direction: ltr;
    text-align: left;
    font-family: "Roboto", sans-serif; /* Ensure fonts are loaded */
}

/* Ensure Bootstrap RTL is applied correctly within components that inherit direction */
.container, .row, .col-md-6, .col-md-12, .d-flex, .mb-4, .mb-3, .mt-3, .me-2, .ms-auto {
    direction: inherit;
    text-align: inherit;
}

/* Navbar style */
.navbar {
    background-color: #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    padding: 1rem 0;
}

.navbar-brand {
    font-size: 1.5rem;
    font-weight: bold;
    color: #333 !important;
}

.navbar-nav .nav-link {
    color: #555 !important;
    margin-left: 15px; /* Adjust margin for RTL */
    margin-right: 0;
}

body[dir="ltr"] .navbar-nav .nav-link {
    margin-left: 0;
    margin-right: 15px; /* Adjust margin for LTR */
}

.navbar-nav .nav-link:hover {
    color: #007bff !important;
}

.dropdown-menu {
    right: 0; /* Position dropdown on the right for RTL */
    left: auto;
    text-align: right; /* Align text right for RTL */
    border: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

body[dir="ltr"] .dropdown-menu {
    right: auto; /* Position dropdown on the left for LTR */
    left: 0;
    text-align: left; /* Align text left for LTR */
}

.dropdown-item {
    text-align: inherit; /* Inherit text alignment */
    padding: 0.5rem 1rem;
}

.dropdown-item:hover {
    background-color: #f8f9fa;
    color: #007bff;
}

/* Landing Page Styles */
.site-header { /* هذا هو الهيدر الذي سيتم إخفاؤه عند النقر على "ابدأ" */
    position: relative;
    height: 500px;
    display: flex; /* Keep flex for initial state */
    align-items: center;
    justify-content: center;
    text-align: center;
    color: white;
    overflow: hidden;
    margin-bottom: 40px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.header-background {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('header-background.jpeg.webp');
    background-size: cover;
    background-position: center;
    filter: brightness(0.5);
    z-index: 1;
}

.header-content {
    position: relative;
    z-index: 2;
    padding: 0 20px;
    opacity: 1;
    transform: translateY(0);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
}

.site-header h1 {
    font-size: 3.5em;
    margin-bottom: 20px;
    color: white;
    text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.6);
    font-weight: 700;
    width: 100%;
}

.site-header p.lead {
    font-size: 1.5em;
    margin-bottom: 30px;
    color: white;
}

/* Responsive Adjustments for Header */
@media (max-width: 768px) {
    .site-header {
        height: 300px;
    }
    .site-header h1 {
        font-size: 1.8em;
    }
    .site-header p.lead {
        font-size: 1.2em;
    }
    .header-content {
        gap: 10px;
    }
}

/* --- Page/Modal Styles (for the new page-based approach) --- */
.page-section {
    display: none;
    min-height: calc(100vh - 100px); /* Adjust based on navbar/footer height */
    padding: 20px;
    background-color: #f7f9fc;
}

.page-section.active-page {
    display: block; /* Show the active page */
}

.page-section .container {
    background-color: #fff;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.popup-box {
    position: relative;
    background-color: #fff;
    padding: 30px;
    border-radius: 10px;
    max-width: 95%;
    width: 100%;
    min-height: 80vh;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    box-sizing: border-box;
    margin: 20px auto;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

#cv-preview-page .container { /* Styles for the container within #cv-preview-page */
    width: 100%;
    max-width: 100%; /* Allow it to be full width */
    padding: 15px;
    margin: 10px auto;
}

#qr-manual-payment-page .container { /* Styles for the container within #qr-manual-payment-page */
    padding: 30px;
    border-radius: 8px;
    width: 550px; /* Fixed width for desktop for payment form */
    max-width: 90vw; /* Responsive max-width */
    text-align: center;
    background: white;
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow-y: auto;
    box-sizing: border-box;
    margin: 20px auto;
}

.popup-close {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 1.5rem;
    cursor: pointer;
    border: none;
    background: transparent;
    color: #000;
    padding: 5px;
    z-index: 10;
}

body[dir="ltr"] .popup-close {
    left: auto;
    right: 10px;
}

.popup-close:hover {
    color: red;
}

/* --- CV Builder Form Styles --- */
.form-group {
    margin-bottom: 1rem;
}

.form-group label {
    font-weight: 600;
    margin-bottom: 0.5rem;
    display: block;
}

input[type="text"],
input[type="email"],
input[type="file"],
textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ced4da;
    border-radius: 0.375rem;
    box-sizing: border-box;
    margin-bottom: 10px;
    direction: inherit;
    text-align: inherit;
}

textarea {
    resize: vertical;
}

.form-group .btn {
    margin-bottom: 10px;
    margin-left: 5px;
    margin-right: 0;
}

body[dir="ltr"] .form-group .btn {
    margin-left: 0;
    margin-right: 5px;
}

.remove-field {
    position: absolute;
    top: 8px;
    left: 8px;
    background: none;
    border: none;
    color: #dc3545;
    font-size: 1.2em;
    cursor: pointer;
    z-index: 1;
    padding: 5px;
}

body[dir="ltr"] .remove-field {
    left: auto;
    right: 8px;
}

.remove-field:hover {
    color: #c82333;
}

.experience-entry,
.education-entry,
.skill-entry,
.language-entry,
.reference-entry {
    border: 1px dashed #ccc;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 5px;
    position: relative;
}

.experience-entry textarea {
    margin-bottom: 0;
}

.btn-outline-primary {
    color: #0d6efd;
    border-color: #0d6efd;
    background-color: transparent;
}

.btn-outline-primary:hover {
    color: #fff;
    background-color: #0d6efd;
    border-color: #0d6efd;
}

.btn-outline-danger {
    color: #dc3545;
    border-color: #dc3545;
    background-color: transparent;
}

.btn-outline-danger:hover {
    color: #fff;
    background-color: #dc3545;
    border-color: #dc3545;
}

/* Progress bar style */
.progress-container {
    margin: 1rem 0;
    height: 15px;
    background: #e9ecef;
    border-radius: 10px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    width: 0%;
    background: #0d6efd;
    border-radius: 10px;
    transition: width 0.3s ease, background-color 0.3s ease;
    color: #fff;
    text-align: center;
    line-height: 15px;
    font-size: 0.7em;
}

/* Language toggle style */
.language-toggle {
    z-index: 1000;
    background-color: rgba(255, 255, 255, 0.8);
    border: 1px solid #ced4da;
    border-radius: 5px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 0.9em;
    user-select: none;
    transition: background-color 0.3s ease;
    margin-right: 10px;
}



body[dir="ltr"] .language-toggle {
    margin-right: 0;
    margin-left: 10px;
}

.language-toggle:hover {
    background-color: rgba(240, 240, 240, 0.9);
}

/* --- Template Preview Styles --- */
.template-preview-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-bottom: 30px;
    overflow-y: auto;
    max-height: calc(100vh - 250px);
    padding-right: 15px;
    box-sizing: border-box;
}

body[dir="ltr"] .template-preview-container {
    padding-right: 0;
    padding-left: 15px;
}

.template-category {
    width: 100%;
    text-align: center;
    margin-bottom: 20px;
}

.template-category h3 {
    font-size: 1.4em;
    color: #333;
    margin-bottom: 15px;
    border-bottom: 2px solid #0d6efd;
    display: inline-block;
    padding-bottom: 5px;
}

.template-previews {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
}

.template-preview {
    cursor: pointer;
    border: 3px solid transparent;
    transition: all 0.3s ease;
    width: 300px;
    height: auto;
    object-fit: cover;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.template-preview:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.selected-template {
    border-color: #0d6efd !important;
    box-shadow: 0 3px 10px rgba(13, 110, 253, 0.4);
}

/* --- CV Preview Area and CV Container Styles --- */
#cv-preview-area { /* هذا هو الـ div الذي يحيط بـ #cv-container في صفحة المعاينة */
    flex-grow: 1;
    overflow-y: auto; /* السماح بالتمرير إذا كانت السيرة أطول من الشاشة */
    max-height: calc(100vh - 200px); /* ارتفاع معقول لمنطقة المعاينة */
    display: flex;
    justify-content: center;
    align-items: flex-start; /* لمحاذاة السيرة في الأعلى إذا كانت أقصر */
    padding: 20px; /* حشوة حول منطقة المعاينة */
    background-color: #e9ecef; /* خلفية لمنطقة المعاينة لتمييزها */
    border-radius: 8px;
    margin-top: 20px;
    box-sizing: border-box;
}

/* --- Base CV Container Styles --- */
/* هذه الأنماط هي الحالة الافتراضية لـ #cv-container عندما تكون مرئية في #cv-preview-area */
/* JavaScript (captureCVasPDF) سيقوم بتغيير هذه الأنماط مؤقتًا عند التقاط الـ PDF */
#cv-container {
    width: 100%; /* اجعلها تأخذ عرض مناسب داخل #cv-preview-area */
    max-width: 210mm; /* حد أقصى للعرض لتبدو كـ A4 في المعاينة */
    min-height: 297mm; /* ارتفاع A4 كحد أدنى للمعاينة، ولكن يمكن أن ينمو */
    height: auto; /* السماح للارتفاع بالنمو */
    margin: 0 auto; /* توسيطها في #cv-preview-area */
    box-sizing: border-box;
    background: white;
    color: #212529;
    box-shadow: 0 0 15px rgba(0,0,0,0.2); /* ظل لتمييزها كورقة */
    display: flex; /* للسماح بتمدد .cv-content */
    flex-direction: column; /* لترتيب العناصر الداخلية عمودياً */
    overflow: hidden; /* إخفاء أي تجاوزات غير متوقعة في وضع المعاينة */
    /* لا تضع هنا position: absolute; left: -9999px; visibility: hidden; */
    /* هذه ستتم إدارتها بواسطة JavaScript مؤقتًا */
    font-family: 'Segoe UI', Arial, sans-serif; /* خط افتراضي إذا لم يحدده القالب */
    line-height: 1.6;
}

/* Watermark style - يتم التحكم في إضافته عبر JavaScript (.watermarked class) */
#cv-container.watermarked {
    position: relative; /* ضروري لتموضع ::before */
}

#cv-container.watermarked::before {
    content: var(--watermark-text, "PREVIEW - للعرض فقط"); /* النص يأتي من متغير CSS */
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    width: 200% !important; /* اجعلها كبيرة جداً لتغطي حتى لو امتدت لعدة صفحات */
    height: 200% !important;
    transform: translate(-50%, -50%) rotate(-40deg) scale(0.9) !important;
    font-size: clamp(2em, 8vw, 4.5em) !important; /* حجم خط متجاوب وواضح */
    color: rgba(0, 0, 0, 0.08) !important; /* لون خفيف جداً لكن مرئي */
    font-weight: bold !important;
    text-align: center !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    pointer-events: none !important;
    z-index: 10000 !important; /* فوق كل محتوى السيرة */
    line-height: 1.2 !important;
    word-break: break-word !important;
    white-space: pre-wrap !important;
    opacity: 1 !important; /* لا تحتاج شفافية إضافية إذا كان اللون خفيفًا */
    overflow: hidden; /* لمنع أي تأثير على التخطيط */
}


/* Container for the main CV content (header + layout) */
.cv-content {
    flex-grow: 1 !important;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 0; /* الحشوة الفعلية تكون في الأقسام أو الأعمدة */
}

/* CV Header Styles - Enhanced Professionalism */
.cv-header {
    display: flex;
    align-items: center;
    border-bottom: 2px solid; /* سيتم تخصيص اللون بواسطة القوالب */
    padding-bottom: 15px; /* تقليل الحشوة قليلاً */
    margin-bottom: 20px; /* تقليل الهامش قليلاً */
    box-sizing: border-box;
    flex-shrink: 0;
    padding: 10px; /* تقليل الحشوة العامة للهيدر */
}

.cv-header.centered {
    justify-content: center;
    flex-direction: column;
    text-align: center;
}

/* Two-column layout header (within main content) */
.cv-header.two-col-main {
    border-bottom: 2px solid; /* سيتم تخصيص اللون بواسطة القوالب */
    padding-bottom: 10px;
    margin-bottom: 20px;
    display: block;
    box-sizing: border-box;
    flex-shrink: 0;
}

/* Professional Layout Header (Top Bar) */
.cv-header.professional-layout {
    display: block; /* أو grid إذا كان جزءًا من شبكة الـ layout */
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
    color: #f8f9fa; /* لون النص الافتراضي هنا */
    padding: 20px 30px;
    text-align: center;
    box-sizing: border-box;
    flex-shrink: 0;
}

.cv-header.professional-layout .cv-name {
    color: inherit; /* يرث اللون من .cv-header.professional-layout */
    font-size: 2.8em;
    margin: 0 0 5px 0;
    font-weight: 700;
}

.cv-header.professional-layout .cv-title {
    color: #ced4da; /* لون أفتح للعنوان الفرعي */
    font-size: 1.5em;
    margin: 0 0 15px 0;
    font-weight: 400;
}

.cv-header.professional-layout .cv-contact-info {
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    padding-top: 15px;
    margin-top: 15px;
    text-align: center;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 15px;
}

.justify-content-around img{
    width: 100px;
}

.cv-header.professional-layout .cv-contact-item {
    justify-content: center;
    margin-bottom: 0;
    color: inherit; /* يرث اللون */
}

.cv-header.professional-layout .cv-contact-item i {
    color: #adb5bd; /* لون الأيقونات */
    margin-left: 8px;
    margin-right: 0;
}

body[dir="ltr"] .cv-header.professional-layout .cv-contact-item i {
    margin-left: 0;
    margin-right: 8px;
}

/* Profile Picture - Adjusted for better integration */
.cv-profile-pic {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 3px solid; /* سيتم تخصيص اللون بواسطة القوالب */
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
    margin-left: 20px; /* RTL default */
    flex-shrink: 0;
}

body[dir="ltr"] .cv-profile-pic {
    margin-left: 0;
    margin-right: 20px; /* LTR */
}

.cv-header:not(.centered):not(.professional-layout) {
    display: flex;
    align-items: center;
}

/* لا حاجة لقواعد اتجاه إضافية هنا إذا كانت القاعدة العامة أعلاه كافية */

.cv-header.centered .cv-profile-pic,
.cv-header.professional-layout .cv-profile-pic { /* Picture in professional header (if any) */
    margin: 0 auto 15px auto;
    display: block;
}

/* Name and Title */
.cv-name {
    font-size: 2.5em; /* حجم اسم كبير وواضح */
    margin: 0 0 5px 0; /* تقليل الهوامش قليلاً */
    color: #212529;
    word-break: break-word;
    font-weight: 700;
}

.cv-title {
    font-size: 1.3em;
    margin: 0 0 10px 0; /* تقليل الهوامش قليلاً */
    color: #007bff; /* لون افتراضي للمسمى الوظيفي، سيتم تخصيصه */
    word-break: break-word;
    font-weight: 400;
}

/* Contact Info */
.cv-contact-info {
    margin-top: 10px; /* تقليل الهامش العلوي */
    display: flex;
    flex-wrap: wrap;
    gap: 8px 15px; /* تقليل الفجوات قليلاً */
    justify-content: inherit; /* يرث من الأب */
}

.cv-contact-item {
    display: flex;
    align-items: center;
    margin-bottom: 0; /* لا حاجة لهامش سفلي إذا كان هناك gap */
    word-break: break-word;
    white-space: normal;
    font-size: 0.95em;
    color: #555;
}

.cv-contact-item i {
    margin-left: 8px; /* RTL default */
    width: 18px;
    text-align: center;
    flex-shrink: 0;
    color: #007bff; /* لون أيقونات افتراضي */
}

body[dir="ltr"] .cv-contact-item i {
    margin-left: 0;
    margin-right: 8px; /* LTR */
}

.cv-contact-item p {
    margin: 0;
}

/* Sections (Objective, Experience, Education, etc.) */
.cv-section {
    margin-bottom: 15mm !important; /* استخدام mm للطباعة أفضل */
    padding: 0 !important; /* إزالة الحشوة من هنا، ستكون في العناصر الداخلية */
    background-color: transparent; /* شفاف بشكل افتراضي */
    border-radius: 0; /* لا حاجة لحواف دائرية في الطباعة عادةً */
    box-sizing: border-box;
}

.cv-section.no-padding { /* هذه الفئة قد لا تكون ضرورية إذا كان padding:0 هو الافتراضي */
    padding: 0;
    background-color: transparent;
}

.cv-section.no-margin {
    margin-bottom: 0;
}

.cv-section-title {
    font-size: 1.2em; /* حجم مناسب لعناوين الأقسام */
    font-weight: 600;
    margin-bottom: 8mm !important;
    padding-bottom: 3mm !important;
    border-bottom: 1.5px solid; /* خط أنحف قليلاً */
    color: #007bff; /* لون افتراضي، سيتم تخصيصه */
}

.cv-sidebar .cv-section-title {
    text-align: center; /* أغلب القوالب ذات الشريط الجانبي تكون عناوينها متوسطة */
}

/* Experience and Education Items */
.cv-experience-item,
.cv-education-item {
    margin-bottom: 5mm !important;
    padding-bottom: 3mm !important;
    border-bottom: 0.5px solid #dee2e6; /* خط فاصل خفيف جداً */
    box-sizing: border-box;
}

.cv-experience-item:last-child,
.cv-education-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0; /* لا حاجة لهامش سفلي للعنصر الأخير في القائمة */
}

.cv-job-title,
.cv-degree {
    font-size: 1.05em;
    font-weight: bold;
    margin: 0 0 2mm 0;
}

.cv-company,
.cv-institution {
    color: #6c757d;
    margin-bottom: 2mm;
    font-size: 0.95em;
}

.cv-duration {
    color: #666;
    font-size: 0.9em;
    display: inline-block; /* أو block إذا كان دائماً في سطر جديد */
    margin-right: 10px; /* RTL default */
}

body[dir="ltr"] .cv-duration {
    margin-right: 0;
    margin-left: 10px; /* LTR */
}

.cv-experience-item p, /* وصف الخبرة */
.cv-education-item p { /* أي تفاصيل إضافية للمؤهل */
    word-break: break-word;
    white-space: normal; /* أو pre-wrap إذا أردت الحفاظ على الأسطر الجديدة من textarea */
    line-height: 1.6;
    font-size: 0.9em; /* حجم خط أصغر قليلاً للوصف */
    margin-top: 2mm;
}

/* Skills List */
.cv-skill-list {
    column-count: 2; /* افتراضي عمودين، يمكن تغييره بالقوالب */
    column-gap: 10mm;
    list-style: none;
    padding: 0;
    margin: 0;
}

.cv-skill-list.single-column {
    column-count: 1;
}

.cv-skill-list li { /* هذا النمط لـ li إذا كانت المهارات كقائمة نقطية تقليدية */
    break-inside: avoid-column;
    margin-bottom: 2mm;
    position: relative;
    padding-right: 15px; /* RTL default */
}
/* body[dir="ltr"] .cv-skill-list li { ... } إذا كانت القائمة نقطية */

/* النمط التالي لـ .cv-skill-item إذا كانت المهارات كـ "badges" */
.cv-skill-item { /* هذا إذا كانت المهارات كـ "tags" أو "badges" */
    display: inline-block; /* أو block إذا كانت كل مهارة في سطر */
    background-color: #e9ecef;
    padding: 5px 10px;
    border-radius: 15px; /* حواف دائرية للـ badges */
    margin-bottom: 2mm;
    margin-left: 2mm; /* RTL default */
    font-size: 0.9em;
    color: #212529;
}

body[dir="ltr"] .cv-skill-item {
    margin-left: 0;
    margin-right: 2mm; /* LTR */
}

/* Languages List */
.cv-language-list {
    list-style: none; /* أو disc إذا أردت نقاط */
    padding: 0;
    margin: 0;
}

.cv-language-list li {
    margin-bottom: 2mm;
    /* position: relative; padding-right: 15px; إذا كانت بنقاط */
}
/* body[dir="ltr"] .cv-language-list li { ... } إذا كانت بنقاط */

/* References List */
.cv-references-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.cv-reference-item {
    margin-bottom: 4mm;
    padding-bottom: 2mm;
    border-bottom: 0.5px dashed #ccc; /* خط متقطع خفيف */
}

.cv-reference-item:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
}

.cv-reference-item h4 { /* اسم المرجع */
    margin: 0 0 1mm 0;
    font-size: 1em;
    font-weight: 600;
}

.cv-reference-item p { /* تفاصيل المرجع */
    margin: 0.5mm 0;
    font-size: 0.9em;
    color: #fff;
}

/* Objective text wrapping */
.cv-section#objective p {
    word-break: break-word;
    white-space: normal; /* أو pre-wrap إذا أردت الحفاظ على الأسطر من textarea */
    line-height: 1.6;
}

/* --- Two-Column Layouts (Standard, Professional, AST) --- */
/* هذه هي الحاويات الرئيسية للتخطيطات متعددة الأعمدة */
.cv-two-column-layout,
.cv-professional-layout, /* professional-layout قد يستخدم grid أكثر من flex مباشر */
.ast-layout {
    flex-grow: 1 !important;
    display: flex; /* Flex هو الأساس لمعظم التخطيطات ثنائية الأعمدة */
    gap: 10mm; /* فجوة بين الأعمدة، يمكن تعديلها */
    /* overflow: hidden; لا نضع overflow:hidden هنا، يجب أن يكون المحتوى مرئيًا بالكامل للطباعة */
}

/* ترتيب الأعمدة الصحيح لـ RTL/LTR */
/* Note: script.js may also set dir attribute directly on elements */
.cv-two-column-layout[dir="rtl"],
.ast-layout[dir="rtl"] {
    flex-direction: row; /* الشريط الجانبي (الأول في DOM) سيكون على اليمين */
}

.cv-two-column-layout[dir="ltr"],
.ast-layout[dir="ltr"] {
    flex-direction: row-reverse; /* الشريط الجانبي (الأول في DOM) سيكون على اليسار */
}

/* Professional Layout uses Grid */
/* تم تعديل هذا القسم لجعل الشريط الجانبي دائماً على اليسار في معاينة المتصفح */
.cv-professional-layout {
    display: grid !important; /* استخدام grid للتخطيط الاحترافي */
    grid-template-rows: auto 1fr; /* صف للرأس، والباقي للأعمدة */
    gap: 10mm !important; /* فجوة بين مناطق الشبكة */
    grid-template-columns: 80mm 1fr; /* الشريط الجانبي على اليسار بعرض 80mm، المحتوى الرئيسي على اليمين لكلا الاتجاهين */
    grid-template-areas:
        "header header"
        "sidebar main";
}

/* هذا التغيير لا يعتمد على الـ dir، لجعل الشريط الجانبي دائماً على اليسار في المعاينة */
.cv-professional-layout[dir="rtl"] {
    grid-template-columns: 80mm 1fr; /* الشريط الجانبي على اليسار بعرض 80mm، المحتوى الرئيسي على اليمين */
    grid-template-areas:
        "header header"
        "sidebar main"; /* sidebar main */
}

.cv-professional-layout[dir="ltr"] {
    grid-template-columns: 80mm 1fr; /* الشريط الجانبي على اليسار بعرض 80mm، المحتوى الرئيسي على اليمين */
    grid-template-areas:
        "header header"
        "sidebar main"; /* sidebar main */
}


/* Sidebar and Main Content - common styles */
.cv-sidebar,
.cv-main-content {
    padding: 10mm; /* حشوة داخلية للأعمدة، يمكن تعديلها بالقوالب */
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start; /* لضمان بدء المحتوى من الأعلى */
    flex-grow: 1; /* اسمح لهما بالتمدد لملء المساحة المتاحة */
    min-height: calc(297mm - 40mm); /* ارتفاع افتراضي لضمان الامتداد (A4 - padding top/bottom of container - header) */
                                  /* يجب ضبط هذا بعناية، أو الاعتماد على flex-grow */
    overflow: visible !important; /* إبقاء هذا للعرض على الشاشة، الطباعة ستتجاوزه */
}

/* Sidebar in Standard and AST Layout */
.cv-two-column-layout .cv-sidebar,
.ast-layout .cv-sidebar {
    width: 80mm; /* عرض ثابت للشريط الجانبي */
    flex-shrink: 0; /* لا تدعه يتقلص */
    background-color: #e9ecef; /* لون خلفية افتراضي، سيتم تخصيصه */
    color: #212529;
}

/* Main Content in Standard and AST Layout */
.cv-two-column-layout .cv-main-content,
.ast-layout .cv-main-content {
    background-color: #fff; /* لون خلفية افتراضي */
}

/* Sidebar in Professional Layout */
.cv-professional-layout .cv-sidebar {
    grid-area: sidebar;
    background-color: #343a40; /* لون افتراضي داكن للشريط الجانبي الاحترافي */
    color: #f8f9fa;
}

/* Main Content in Professional Layout */
.cv-professional-layout .cv-main-content {
    grid-area: main;
    background-color: #fff;
}

/* --- Specific styles for elements within different layouts --- */

/* Standard/AST Layout Sidebar specifics */
.cv-two-column-layout .cv-sidebar .cv-profile-pic,
.ast-layout .cv-sidebar .cv-profile-pic {
    margin: 0 auto 15px auto; display: block;
}
.cv-two-column-layout .cv-sidebar .cv-section-title,
.ast-layout .cv-sidebar .cv-section-title {
    color: #6c757d; border-bottom-color: #dee2e6;
}
.cv-two-column-layout .cv-sidebar .cv-contact-item i,
.ast-layout .cv-sidebar .cv-contact-item i { color: #6c757d; }

.cv-two-column-layout .cv-sidebar .cv-skill-item, /* Skills as badges in sidebar */
.ast-layout .cv-sidebar .cv-skill-item {
    background-color: #6c757d; color: #f8f9fa; display: block; text-align: center;
}

/* Standard/AST Layout Main Content specifics */
.cv-two-column-layout .cv-main-content .cv-header.two-col-main, /* Header within main content */
.ast-layout .cv-main-content .cv-header.two-col-main {
    border-bottom-color: #007bff;
}
.cv-two-column-layout .cv-main-content .cv-name,
.ast-layout .cv-main-content .cv-name { color: #212529; }
.cv-two-column-layout .cv-main-content .cv-title,
.ast-layout .cv-main-content .cv-title { color: #007bff; }
.cv-two-column-layout .cv-main-content .cv-section, /* Sections in main content */
.ast-layout .cv-main-content .cv-section { background-color: #fff; padding: 0; margin-bottom: 8mm; }
.cv-two-column-layout .cv-main-content .cv-section-title,
.ast-layout .cv-main-content .cv-section-title { color: #007bff; border-color: #007bff; }

/* Professional Layout Sidebar specifics */
.cv-professional-layout .cv-sidebar .cv-profile-pic { border-color: #f8f9fa; margin:0 auto 15px auto; }
.cv-professional-layout .cv-sidebar .cv-section-title { color: #f8f9fa; border-bottom-color: #6c757d; }
.cv-professional-layout .cv-sidebar .cv-contact-item i { color: #adb5bd; }
.cv-professional-layout .cv-sidebar .cv-skill-item { background-color: #495057; color: #fff; display: block; text-align: center;}

/* Professional Layout Main Content specifics */
.cv-professional-layout .cv-main-content { background-color: #fff; color: #333; }
.cv-professional-layout .cv-main-content .cv-section { background-color: #fff; padding: 0; margin-bottom: 8mm;}
.cv-professional-layout .cv-main-content .cv-section-title { color: #007bff; border-color: #007bff; }


/* End Marker Style - لضمان امتداد المحتوى وتجاوز الصفحات بشكل صحيح */
.cv-end-marker {
    height: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    font-size: 1px !important; /* اجعله غير مرئي تقريباً */
    line-height: 1px !important;
    color: transparent !important;
    background-color: transparent !important;
    visibility: hidden !important; /* مخفي في العرض العادي */
    width: 100%;
    display: block !important;
    page-break-before: auto !important; /* لا تجبر كسر صفحة قبله إلا إذا لزم الأمر */
    page-break-inside: avoid !important; /* منع كسر العنصر نفسه */
    margin-top: auto !important; /* هام: يدفع العنصر لأسفل الـ flex container إذا كان الـ container يستخدم flex */
    align-self: flex-end !important; /* يدفعه لأسفل عموده إذا كان الـ container يستخدم flex */
}


/* Filler div style (used by JS to help with stretching if needed, less common now with flex-grow) */
.filler {
    flex-grow: 1;
    min-height: 1px;
    font-size: 1pt;
    line-height: 1;
    overflow: hidden;
    page-break-inside: avoid;
}


/* --- Normal Layout Templates --- */
/* (Your existing template styles for .normal-layout.template1 to template12 go here) */
/* Example for one, apply to all */
.normal-layout.template1 .cv-header { background-color: #0056b3; color: #e9ecef; border-bottom: 4px solid #004085; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template1 .cv-name { color: #ffffff; font-family: 'Roboto', sans-serif; font-weight: 900; font-size: 2em; }
.normal-layout.template1 .cv-title { color: #ffff; font-family: 'Roboto', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template1 .cv-contact-item i { color: #ffff; } /* Removed margin-right here, handled by general .cv-contact-item i */
.normal-layout.template1 .cv-section-title { color: #004085; border-bottom-color: #cce5ff; font-family: 'Roboto', sans-serif; font-weight: 700; }
.normal-layout.template1 .cv-profile-pic { border: 4px solid #ffffff; }
.normal-layout.template1 #cv-container { font-family: 'Roboto', sans-serif; color: #343a40; } /* This targets the whole container */
.normal-layout.template1 .cv-contact-item { font-family: 'Roboto', sans-serif; color: #ffffff; } /* Specific contact item color */

/* ... (Repeat for template2 to template12 for normal-layout) ... */
.normal-layout.template2 .cv-header { background-color: #f0f0f0; color: #333; border-bottom: 4px solid #555; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template2 .cv-name { color: #212121; font-family: 'Lato', sans-serif; font-weight: 900; font-size: 2em; }
.normal-layout.template2 .cv-title { color: #555; font-family: 'Lato', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template2 .cv-contact-item i { color: #555; }
.normal-layout.template2 .cv-section-title { color: #333; border-bottom-color: #ccc; font-family: 'Lato', sans-serif; font-weight: 700; }
.normal-layout.template2 .cv-profile-pic { border: 4px solid #555; }
.normal-layout.template2 #cv-container { font-family: 'Lato', sans-serif; color: #495057; }

.normal-layout.template3 .cv-header { background-color: #d4edda; color: #155724; border-bottom: 4px solid #28a745; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template3 .cv-name { color: #0b3d1e; font-family: 'Open Sans', sans-serif; font-weight: 900; font-size: 2em; }
.normal-layout.template3 .cv-title { color: #28a745; font-family: 'Open Sans', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template3 .cv-contact-item i { color: #155724; }
.normal-layout.template3 .cv-section-title { color: #28a745; border-bottom-color: #c3e6cb; font-family: 'Open Sans', sans-serif; font-weight: 700; }
.normal-layout.template3 .cv-profile-pic { border: 4px solid #155724; }
.normal-layout.template3 #cv-container { font-family: 'Open Sans', sans-serif; color: #212121; }

.normal-layout.template4 .cv-header { background-color: #343a40; color: #fff; border-bottom: 4px solid #6c757d; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template4 .cv-name { color: #fff; font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 2em; }
.normal-layout.template4 .cv-title { color: #fff; font-family: 'Montserrat', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template4 .cv-contact-item i { color: #f90505; }
.normal-layout.template4 .cv-section-title { color: #f90505; border-bottom-color: #f90505; font-family: 'Montserrat', sans-serif; font-weight: 700; }
.normal-layout.template4 .cv-profile-pic { border: 4px solid #f90505; }
.normal-layout.template4 #cv-container { font-family: 'Montserrat', sans-serif; color: #212529; }
.normal-layout.template4 .cv-contact-item { font-family: 'Montserrat', sans-serif; color: #fff; }

.normal-layout.template5 .cv-header { background-color: #e6e6fa; color: #4b0082; border-bottom: 4px solid #6a0dad; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template5 .cv-name { font-family: 'Playfair Display', serif; color: #3a0061; font-weight: 900; font-size: 2em; }
.normal-layout.template5 .cv-title { font-family: 'Playfair Display', serif; color: #6a0dad; font-weight: 400; font-size: 1.1em; }
.normal-layout.template5 .cv-contact-item i { color: #6a0dad; }
.normal-layout.template5 .cv-section-title { font-family: 'Playfair Display', serif; color: #4b0082; border-bottom-color: #d8bfd8; font-weight: 700; }
.normal-layout.template5 .cv-profile-pic { border: 4px solid #4b0082; }
.normal-layout.template5 #cv-container { font-family: 'Playfair Display', serif; color: #212121; }

.normal-layout.template6 .cv-header { background-color: #ffeeba; color: #664d03; border-bottom: 4px solid #d39e00; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template6 .cv-name { color: #523c02; font-family: 'Quicksand', sans-serif; font-weight: 900; font-size: 2em; }
.normal-layout.template6 .cv-title { color: #856404; font-family: 'Quicksand', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template6 .cv-contact-item i { color: #856404; }
.normal-layout.template6 .cv-section-title { color: #856404; border-bottom-color: #fff3cd; font-family: 'Quicksand', sans-serif; font-weight: 700; }
.normal-layout.template6 .cv-profile-pic { border: 4px solid #664d03; }
.normal-layout.template6 #cv-container { font-family: 'Quicksand', sans-serif; color: #212121; }

.normal-layout.template7 .cv-header { background-color: #f8d7da; color: #721c24; border-bottom: 4px solid #dc3545; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template7 .cv-name { font-weight: 900; font-family: 'Ubuntu', sans-serif; color: #5d151e; font-size: 2em; }
.normal-layout.template7 .cv-title { font-weight: normal; font-family: 'Ubuntu', sans-serif; color: #dc3545; font-size: 1.1em; }
.normal-layout.template7 .cv-contact-item i { color: #dc3545; }
.normal-layout.template7 .cv-section-title { color: #dc3545; border-bottom-color: #f5c6cb; font-family: 'Ubuntu', sans-serif; font-weight: 700; }
.normal-layout.template7 .cv-profile-pic { border-color: #721c24; border-width: 4px; }
.normal-layout.template7 #cv-container { font-family: 'Ubuntu', sans-serif; color: #212121; }

.normal-layout.template8 .cv-header { background-color: #fcf8e3; color: #856404; border-bottom: 4px solid #d39e00; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template8 .cv-name { color: #664d03; font-family: 'Noto Serif', serif; font-weight: 900; font-size: 2em; }
.normal-layout.template8 .cv-title { color: #a17e1a; font-family: 'Noto Serif', serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template8 .cv-contact-item i { color: #a17e1a; }
.normal-layout.template8 .cv-section-title { color: #a17e1a; border-bottom-color: #fff3cd; font-family: 'Noto Serif', serif; font-weight: 700; }
.normal-layout.template8 .cv-profile-pic { border-color: #856404; border-width: 4px; }
.normal-layout.template8 #cv-container { font-family: 'Noto Serif', serif; color: #383d41; }

.normal-layout.template9 .cv-header { background-color: #eaf4f4; color: #004d40; border-bottom: 4px solid #00796b; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template9 .cv-name { color: #00332c; font-weight: 900; font-family: 'PT Sans', sans-serif; font-size: 2em; }
.normal-layout.template9 .cv-title { color: #00796b; font-family: 'PT Sans', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template9 .cv-contact-item i { color: #00796b; }
.normal-layout.template9 .cv-section-title { color: #00796b; border-bottom-color: #b2dfdb; font-family: 'PT Sans', sans-serif; font-weight: 700; }
.normal-layout.template9 .cv-profile-pic { border-color: #004d40; border-width: 4px; }
.normal-layout.template9 #cv-container { font-family: 'PT Sans', sans-serif; color: #212121; }

.normal-layout.template10 .cv-header { background-color: #f8f9fa; color: #17a2b8; border-bottom: 4px solid #138496; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template10 .cv-name { color: #212529; font-family: 'Arial', sans-serif; font-weight: 900; font-size: 2em; }
.normal-layout.template10 .cv-title { color: #17a2b8; font-family: 'Arial', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template10 .cv-contact-item i { color: #17a2b8; }
.normal-layout.template10 .cv-section-title { color: #138496; border-bottom-color: #d1ecf1; font-family: 'Arial', sans-serif; font-weight: 700; }
.normal-layout.template10 .cv-profile-pic { border-color: #212529; border-width: 4px; }
.normal-layout.template10 #cv-container { font-family: 'Arial', sans-serif; color: #343a40; }

.normal-layout.template11 .cv-header { background-color: #f0e0d4; color: #7f4f24; border-bottom: 4px solid #a27b5c; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template11 .cv-name { color: #633c1c; font-family: 'Georgia', serif; font-weight: 900; font-size: 2em; }
.normal-layout.template11 .cv-title { color: #a27b5c; font-family: 'Georgia', serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template11 .cv-contact-item i { color: #a27b5c; }
.normal-layout.template11 .cv-section-title { color: #a27b5c; border-bottom-color: #eaddd7; font-family: 'Georgia', serif; font-weight: 700; }
.normal-layout.template11 .cv-profile-pic { border-color: #7f4f24; border-width: 4px; }
.normal-layout.template11 #cv-container { font-family: 'Georgia', serif; color: #5a5251; }

.normal-layout.template12 .cv-header { background-color: #e9ecef; color: #495057; border-bottom: 4px solid #6c757d; padding: 20px; border-radius: 8px 8px 0 0; }
.normal-layout.template12 .cv-name { color: #343a40; font-family: 'Verdana', sans-serif; font-weight: 900; font-size: 2em; }
.normal-layout.template12 .cv-title { color: #495057; font-family: 'Verdana', sans-serif; font-weight: 400; font-size: 1.1em; }
.normal-layout.template12 .cv-contact-item i { color: #495057; }
.normal-layout.template12 .cv-section-title { color: #6c757d; border-bottom-color: #dee2e6; font-family: 'Verdana', sans-serif; font-weight: 700; }
.normal-layout.template12 .cv-profile-pic { border-color: #343a40; border-width: 4px; }
.normal-layout.template12 #cv-container { font-family: 'Verdana', sans-serif; color: #212529; }


/* --- Standard Layout Templates --- */
/* (Your existing .standard-layout.template1 to template12 styles go here) */
/* Example for one, apply to all */
.standard-layout #cv-container { /* Global for standard layout, maybe not needed if layout div handles flex */
    /* display: flex; flex-direction: row; No, layout div below handles this */
}
.standard-layout .cv-sidebar { /* Applied by script.js */
    width: 250px; /* This might be overridden by print styles (80mm) */
    padding: 20px; /* General padding, print styles use mm */
    flex-shrink: 0;
    border-radius: 8px 0 0 8px; /* RTL default */
}
.standard-layout[dir="rtl"] .cv-sidebar { border-radius: 0 8px 8px 0; }
.standard-layout .cv-main-content { flex-grow: 1; padding: 20px; }

.standard-layout.template1 .cv-sidebar { background-color: #004085; color: #ffffff; font-family: 'Open Sans', sans-serif; }
.standard-layout.template1 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #0056b3; font-weight: 700; }
.standard-layout.template1 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #a2cbfd; }
.standard-layout.template1 .cv-sidebar .cv-contact-item i { color: #ffffff; }
.standard-layout.template1 .cv-sidebar .cv-skill-item { background-color: #0056b3; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template1 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #007bff; padding-bottom: 15px; margin-bottom: 20px; }
.standard-layout.template1 .cv-main-content .cv-name { color: #212529; font-family: 'Open Sans', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template1 .cv-main-content .cv-title { color: #007bff; font-family: 'Open Sans', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template1 .cv-main-content .cv-section-title { color: #007bff; border-bottom-color: #e9ecef; font-family: 'Open Sans', sans-serif; font-weight: 700; }
.standard-layout.template1 .cv-profile-pic { border: 4px solid #fff; } /* Sidebar profile pic */
.standard-layout.template1 #cv-container { font-family: 'Open Sans', sans-serif; color: #343a40; }


/* ... (Repeat for template2 to template12 for standard-layout) ... */
.standard-layout.template2 .cv-sidebar { background-color: #6c757d; color: #f8f9fa; font-family: 'Roboto', sans-serif; }
.standard-layout.template2 .cv-sidebar .cv-section-title { color: #f8f9fa; border-bottom-color: #ced4da; font-weight: 700; }
.standard-layout.template2 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #f8f9fa; }
.standard-layout.template2 .cv-sidebar .cv-contact-item i { color: #ced4da; }
.standard-layout.template2 .cv-sidebar .cv-skill-item { background-color: #ced4da; color: #212121; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template2 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #495057; padding-bottom: 15px; margin-bottom: 20px; }
.standard-layout.template2 .cv-main-content .cv-name { color: #212529; font-family: 'Roboto', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template2 .cv-main-content .cv-title { color: #495057; font-family: 'Roboto', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template2 .cv-main-content .cv-section-title { color: #495057; border-bottom-color: #f8f9fa; font-family: 'Roboto', sans-serif; font-weight: 700; }
.standard-layout.template2 .cv-profile-pic { border: 4px solid #495057; }
.standard-layout.template2 #cv-container { font-family: 'Roboto', sans-serif; color: #343a40; }

.standard-layout.template3 .cv-sidebar { background-color: #007bff; color: #ffffff; font-family: 'Lato', sans-serif; }
.standard-layout.template3 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #0056b3; font-weight: 700; }
.standard-layout.template3 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #a2cbfd; }
.standard-layout.template3 .cv-sidebar .cv-contact-item i { color: #ffffff; }
.standard-layout.template3 .cv-sidebar .cv-skill-item { background-color: #0056b3; color: #ffffff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template3 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #007bff; }
.standard-layout.template3 .cv-main-content .cv-name { color: #212529; font-family: 'Lato', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template3 .cv-main-content .cv-title { color: #007bff; font-family: 'Lato', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template3 .cv-main-content .cv-section-title { color: #007bff; border-bottom-color: #e9ecef; font-family: 'Lato', sans-serif; font-weight: 700; }
.standard-layout.template3 .cv-profile-pic { border: 4px solid #fff; }
.standard-layout.template3 #cv-container { font-family: 'Lato', sans-serif; color: #343a40; }

.standard-layout.template4 .cv-sidebar { background-color: #28a745; color: #ffffff; font-family: 'Ubuntu', sans-serif; }
.standard-layout.template4 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #1e7e34; font-weight: 700; }
.standard-layout.template4 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #d4edda; }
.standard-layout.template4 .cv-sidebar .cv-contact-item i { color: #ffffff; }
.standard-layout.template4 .cv-sidebar .cv-skill-item { background-color: #1e7e34; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template4 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #28a745; }
.standard-layout.template4 .cv-main-content .cv-name { color: #212529; font-family: 'Ubuntu', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template4 .cv-main-content .cv-title { color: #28a745; font-family: 'Ubuntu', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template4 .cv-main-content .cv-section-title { color: #28a745; border-bottom-color: #e2f0ff; font-family: 'Ubuntu', sans-serif; font-weight: 700; }
.standard-layout.template4 .cv-profile-pic { border: 4px solid #fff; }
.standard-layout.template4 #cv-container { font-family: 'Ubuntu', sans-serif; color: #343a40; }

.standard-layout.template5 .cv-sidebar { background-color: #f8f9fa; color: #495057; border-right: 5px solid #007bff; font-family: 'Montserrat', sans-serif; }
.standard-layout.template5[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #007bff; }
.standard-layout.template5 .cv-sidebar .cv-section-title { color: #007bff; border-bottom-color: #e0e9f3; font-weight: 700; }
.standard-layout.template5 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #495057; }
.standard-layout.template5 .cv-sidebar .cv-contact-item i { color: #007bff; }
.standard-layout.template5 .cv-sidebar .cv-skill-item { background-color: #e0e9f3; color: #007bff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template5 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #007bff; }
.standard-layout.template5 .cv-main-content .cv-name { color: #212529; font-family: 'Montserrat', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template5 .cv-main-content .cv-title { color: #007bff; font-family: 'Montserrat', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template5 .cv-main-content .cv-section-title { color: #007bff; border-bottom-color: #ced4da; font-family: 'Montserrat', sans-serif; font-weight: 700; }
.standard-layout.template5 .cv-profile-pic { border: 4px solid #007bff; }
.standard-layout.template5 #cv-container { font-family: 'Montserrat', sans-serif; color: #343a40; }

.standard-layout.template6 .cv-sidebar { width: 200px; background-color: #dee2e6; color: #555; font-family: 'Arial Narrow', Arial, sans-serif; }
.standard-layout.template6 .cv-sidebar .cv-section-title { color: #333; border-bottom-color: #ccc; font-weight: 700; }
.standard-layout.template6 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #555; }
.standard-layout.template6 .cv-sidebar .cv-contact-item i { color: #555; }
.standard-layout.template6 .cv-sidebar .cv-skill-item { background-color: #ccc; color: #333; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template6 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #555; }
.standard-layout.template6 .cv-main-content .cv-name { color: #212529; font-family: 'Arial Narrow', Arial, sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template6 .cv-main-content .cv-title { color: #555; font-family: 'Arial Narrow', Arial, sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template6 .cv-main-content .cv-section-title { color: #555; border-bottom-color: #f0f0f0; font-family: 'Arial Narrow', Arial, sans-serif; font-weight: 700; }
.standard-layout.template6 .cv-profile-pic { border: 4px solid #333; }
.standard-layout.template6 #cv-container { font-family: 'Arial Narrow', Arial, sans-serif; color: #343a40; }

.standard-layout.template7 .cv-sidebar { background-color: #17a2b8; color: #ffffff; font-family: 'Segoe UI', sans-serif; }
.standard-layout.template7 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #138496; font-weight: 700; }
.standard-layout.template7 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #a2e8f1; }
.standard-layout.template7 .cv-sidebar .cv-contact-item i { color: #ffffff; }
.standard-layout.template7 .cv-sidebar .cv-skill-item { background-color: #138496; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template7 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #17a2b8; }
.standard-layout.template7 .cv-main-content .cv-name { color: #212529; font-family: 'Segoe UI', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template7 .cv-main-content .cv-title { color: #17a2b8; font-family: 'Segoe UI', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template7 .cv-main-content .cv-section-title { color: #17a2b8; border-bottom-color: #e9ecef; font-family: 'Segoe UI', sans-serif; font-weight: 700; }
.standard-layout.template7 .cv-profile-pic { border: 4px solid #fff; }
.standard-layout.template7 #cv-container { font-family: 'Segoe UI', sans-serif; color: #343a40; }

.standard-layout.template8 .cv-sidebar { background-color: #495057; color: #ffffff; font-family: 'Verdana', sans-serif; }
.standard-layout.template8 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #6c757d; font-weight: 700; }
.standard-layout.template8 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #adb5bd; }
.standard-layout.template8 .cv-sidebar .cv-contact-item i { color: #ffffff; }
.standard-layout.template8 .cv-sidebar .cv-skill-item { background-color: #6c757d; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template8 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #6c757d; }
.standard-layout.template8 .cv-main-content .cv-name { color: #212529; font-family: 'Verdana', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template8 .cv-main-content .cv-title { color: #6c757d; font-family: 'Verdana', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template8 .cv-main-content .cv-section-title { color: #6c757d; border-bottom-color: #e9ecef; font-family: 'Verdana', sans-serif; font-weight: 700; }
.standard-layout.template8 .cv-profile-pic { border: 4px solid #f8f9fa; }
.standard-layout.template8 #cv-container { font-family: 'Verdana', sans-serif; color: #212121; }

.standard-layout.template9 .cv-sidebar { background-color: #f8d7da; color: #721c24; font-family: 'Calibri', sans-serif; }
.standard-layout.template9 .cv-sidebar .cv-section-title { color: #721c24; border-bottom-color: #dc3545; font-weight: 700; }
.standard-layout.template9 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #721c24; }
.standard-layout.template9 .cv-sidebar .cv-contact-item i { color: #dc3545; }
.standard-layout.template9 .cv-sidebar .cv-skill-item { background-color: #dc3545; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template9 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #dc3545; }
.standard-layout.template9 .cv-main-content .cv-name { color: #212529; font-family: 'Calibri', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template9 .cv-main-content .cv-title { color: #dc3545; font-family: 'Calibri', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template9 .cv-main-content .cv-section-title { color: #dc3545; border-bottom-color: #f5c6cb; font-family: 'Calibri', sans-serif; font-weight: 700; }
.standard-layout.template9 .cv-profile-pic { border: 4px solid #721c24; }
.standard-layout.template9 #cv-container { font-family: 'Calibri', sans-serif; color: #343a40; }

.standard-layout.template10 .cv-sidebar { background-color: #e6e6fa; color: #4b0082; font-family: 'PT Sans', sans-serif; }
.standard-layout.template10 .cv-sidebar .cv-section-title { color: #4b0082; border-bottom-color: #6a0dad; font-weight: 700; }
.standard-layout.template10 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #6a0dad; }
.standard-layout.template10 .cv-sidebar .cv-contact-item i { color: #6a0dad; }
.standard-layout.template10 .cv-sidebar .cv-skill-item { background-color: #6a0dad; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template10 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #6a0dad; }
.standard-layout.template10 .cv-main-content .cv-name { color: #212121; font-family: 'PT Sans', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template10 .cv-main-content .cv-title { color: #6a0dad; font-family: 'PT Sans', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template10 .cv-main-content .cv-section-title { color: #6a0dad; border-bottom-color: #d8bfd8; font-family: 'PT Sans', sans-serif; font-weight: 700; }
.standard-layout.template10 .cv-profile-pic { border: 4px solid #4b0082; }
.standard-layout.template10 #cv-container { font-family: 'PT Sans', sans-serif; color: #343a40; }

.standard-layout.template11 .cv-sidebar { background-color: #ffeeba; color: #664d03; font-family: 'Arial', sans-serif; }
.standard-layout.template11 .cv-sidebar .cv-section-title { color: #664d03; border-bottom-color: #d39e00; font-weight: 700; }
.standard-layout.template11 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #856404; }
.standard-layout.template11 .cv-sidebar .cv-contact-item i { color: #856404; }
.standard-layout.template11 .cv-sidebar .cv-skill-item { background-color: #d39e00; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template11 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #d39e00; }
.standard-layout.template11 .cv-main-content .cv-name { color: #212121; font-family: 'Arial', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template11 .cv-main-content .cv-title { color: #d39e00; font-family: 'Arial', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template11 .cv-main-content .cv-section-title { color: #d39e00; border-bottom-color: #fff3cd; font-family: 'Arial', sans-serif; font-weight: 700; }
.standard-layout.template11 .cv-profile-pic { border: 4px solid #664d03; }
.standard-layout.template11 #cv-container { font-family: 'Arial', sans-serif; color: #343a40; }

.standard-layout.template12 .cv-sidebar { background-color: #c3e6cb; color: #155724; font-family: 'Verdana', sans-serif; }
.standard-layout.template12 .cv-sidebar .cv-section-title { color: #155724; border-bottom-color: #28a745; font-weight: 700; }
.standard-layout.template12 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #1e7e34; }
.standard-layout.template12 .cv-sidebar .cv-contact-item i { color: #1e7e34; }
.standard-layout.template12 .cv-sidebar .cv-skill-item { background-color: #28a745; color: #fff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.standard-layout.template12 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #28a745; }
.standard-layout.template12 .cv-main-content .cv-name { color: #212121; font-family: 'Verdana', sans-serif; font-weight: 900; font-size: 1.8em; }
.standard-layout.template12 .cv-main-content .cv-title { color: #28a745; font-family: 'Verdana', sans-serif; font-weight: 400; font-size: 1em; }
.standard-layout.template12 .cv-main-content .cv-section-title { color: #28a745; border-bottom-color: #d4edda; font-family: 'Verdana', sans-serif; font-weight: 700; }
.standard-layout.template12 .cv-profile-pic { border: 4px solid #155724; }
.standard-layout.template12 #cv-container { font-family: 'Verdana', sans-serif; color: #343a40; }


/* --- Professional Layout Templates --- */
/* (Your existing .professional-layout.template1 to template12 styles go here) */
/* Example for one, apply to all */
.professional-layout #cv-container { /* Global for pro layout, layout div below handles structure */
}
.professional-layout .cv-sidebar {
    width: 250px; /* overridden by print styles (80mm) & grid */
    padding: 20px;
    flex-shrink: 0;
    border-radius: 8px 0 0 8px;
}
.professional-layout[dir="rtl"] .cv-sidebar { border-radius: 0 8px 8px 0; }
.professional-layout .cv-main-content { flex-grow: 1; padding: 20px; }

.professional-layout.template1 .cv-header.professional-layout { background-color: #004085; color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template1 .cv-name { color: #fff; font-family: 'Open Sans', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template1 .cv-title { color: #cce5ff; font-family: 'Open Sans', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template1 .cv-contact-info { border-top: 1px solid #0056b3; margin-top: 15px; padding-top: 15px; }
.professional-layout.template1 .cv-contact-item { color: #ffffff; font-size: 0.9em; } /* Removed margin-right, use gap in .cv-contact-info */
.professional-layout.template1 .cv-contact-item i { color: #cce5ff; }
.professional-layout.template1 .cv-sidebar { background-color: #f8f9fa; color: #495057; font-family: 'Open Sans', sans-serif; border-right: 5px solid #004085; }
.professional-layout.template1[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #004085; }
.professional-layout.template1 .cv-sidebar .cv-profile-pic { border: 4px solid #007bff; margin-bottom: 20px; }
.professional-layout.template1 .cv-sidebar .cv-section-title { color: #004085; border-bottom-color: #e9ecef; font-weight: 700; }
/* .professional-layout.template1 .cv-sidebar .cv-contact-item ... (Sidebar contact info, if different from header) */
.professional-layout.template1 .cv-sidebar .cv-skill-item { background-color: #e0e9f3; color: #007bff; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.professional-layout.template1 .cv-main-content { padding: 20px; } /* Padding for main content area */
.professional-layout.template1 .cv-main-content .cv-section-title { color: #004085; border-bottom-color: #cce5ff; font-family: 'Open Sans', sans-serif; font-weight: 700; }
.professional-layout.template1 #cv-container { font-family: 'Open Sans', sans-serif; color: #343a40; }

/* ... (Repeat for template2 to template12 for professional-layout) ... */

.professional-layout.template2 .cv-header.professional-layout { background-color: #343a40; color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template2 .cv-name { color: #fff; font-family: 'Roboto', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template2 .cv-title { color: #ced4da; font-family: 'Roboto', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template2 .cv-contact-info { border-top: 1px solid #495057; margin-top: 15px; padding-top: 15px; }
.professional-layout.template2 .cv-contact-item { color: #ffffff; font-size: 0.9em; }
.professional-layout.template2 .cv-contact-item i { color: #adb5bd; }
.professional-layout.template2 .cv-sidebar { background-color: #f0f0f0; color: #495057; font-family: 'Roboto', sans-serif; border-right: 5px solid #495057; }
.professional-layout.template2[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #495057; }
.professional-layout.template2 .cv-sidebar .cv-profile-pic { border: 4px solid #495057; }
.professional-layout.template2 .cv-sidebar .cv-section-title { color: #495057; border-bottom-color: #ced4da; font-weight: 700; }
.professional-layout.template2 .cv-sidebar .cv-skill-item { background-color: #ced4da; color: #212121; }
.professional-layout.template2 .cv-main-content .cv-section-title { color: #343a40; border-bottom-color: #e9ecef; font-family: 'Roboto', sans-serif; font-weight: 700; }
.professional-layout.template2 #cv-container { font-family: 'Roboto', sans-serif; color: #212121; }

.professional-layout.template3 .cv-header.professional-layout { background-color: #1e7e34; color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template3 .cv-header.professional-layout .cv-name { color: #fff; font-family: 'Lato', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template3 .cv-header.professional-layout .cv-title { color: #d4edda; font-family: 'Lato', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template3 .cv-header.professional-layout .cv-contact-info { border-top: 1px solid #28a745; }
.professional-layout.template3 .cv-header.professional-layout .cv-contact-item { color: #ffffff; }
.professional-layout.template3 .cv-header.professional-layout .cv-contact-item i { color: #d4edda; }
.professional-layout.template3 .cv-sidebar { background-color: #f8f9fa; color: #495057; font-family: 'Lato', sans-serif; border-right: 5px solid #28a745; }
.professional-layout.template3[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #28a745; }
.professional-layout.template3 .cv-sidebar .cv-profile-pic { border: 4px solid #28a745; }
.professional-layout.template3 .cv-sidebar .cv-section-title { color: #28a745; border-bottom-color: #d4edda; }
.professional-layout.template3 .cv-sidebar .cv-skill-item { background-color: #d4edda; color: #28a745; }
.professional-layout.template3 .cv-main-content .cv-section-title { color: #1e7e34; border-bottom-color: #c3e6cb; font-family: 'Lato', sans-serif; font-weight: 700; }
.professional-layout.template3 #cv-container { font-family: 'Lato', sans-serif; color: #212121; }

.professional-layout.template4 .cv-header.professional-layout { background-color: #dc3545; color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template4 .cv-name { color: #fff; font-family: 'Ubuntu', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template4 .cv-title { color: #f8d7da; font-family: 'Ubuntu', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template4 .cv-contact-info { border-top: 1px solid #c82333; }
.professional-layout.template4 .cv-contact-item { color: #ffffff; }
.professional-layout.template4 .cv-contact-item i { color: #f8d7da; }
.professional-layout.template4 .cv-sidebar { background-color: #f8f9fa; color: #495057; font-family: 'Ubuntu', sans-serif; border-right: 5px solid #dc3545; }
.professional-layout.template4[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #dc3545; }
.professional-layout.template4 .cv-sidebar .cv-profile-pic { border: 4px solid #dc3545; }
.professional-layout.template4 .cv-sidebar .cv-section-title { color: #dc3545; border-bottom-color: #f5c6cb; }
.professional-layout.template4 .cv-sidebar .cv-skill-item { background-color: #f8d7da; color: #dc3545; }
.professional-layout.template4 .cv-main-content .cv-section-title { color: #c82333; border-bottom-color: #f5c6cb; font-family: 'Ubuntu', sans-serif; font-weight: 700; }
.professional-layout.template4 #cv-container { font-family: 'Ubuntu', sans-serif; color: #212121; }

.professional-layout.template5 .cv-header.professional-layout{ background-color: #6f42c1; color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template5 .cv-name { color: #fff; font-family: 'Montserrat', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template5 .cv-title { color: #e6e6fa; font-family: 'Montserrat', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template5 .cv-contact-info { border-top: 1px solid #563d7c; }
.professional-layout.template5 .cv-contact-item { color: #ffffff; }
.professional-layout.template5 .cv-contact-item i { color: #e6e6fa; }
.professional-layout.template5 .cv-sidebar { background-color: #f8f9fa; color: #495057; font-family: 'Montserrat', sans-serif; border-right: 5px solid #6f42c1; }
.professional-layout.template5[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #6f42c1; }
.professional-layout.template5 .cv-sidebar .cv-profile-pic { border: 4px solid #6f42c1; }
.professional-layout.template5 .cv-sidebar .cv-section-title { color: #6f42c1; border-bottom-color: #d6c8eb; }
.professional-layout.template5 .cv-sidebar .cv-skill-item { background-color: #d6c8eb; color: #6f42c1; }
.professional-layout.template5 .cv-main-content .cv-section-title { color: #563d7c; border-bottom-color: #e6e6fa; font-family: 'Montserrat', sans-serif; font-weight: 700; }
.professional-layout.template5 #cv-container { font-family: 'Montserrat', sans-serif; color: #212121; }

.professional-layout.template6 .cv-header.professional-layout{ background-color: #ffc107; color: #212121; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template6 .cv-name { color: #212121; font-family: 'Arial', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template6 .cv-title { color: #664d03; font-family: 'Arial', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template6 .cv-contact-info { border-top: 1px solid #d39e00; }
.professional-layout.template6 .cv-contact-item { color: #212121; }
.professional-layout.template6 .cv-contact-item i { color: #664d03; }
.professional-layout.template6 .cv-sidebar { background-color: #f8f9fa; color: #495057; font-family: 'Arial', sans-serif; border-right: 5px solid #ffc107; }
.professional-layout.template6[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #ffc107; }
.professional-layout.template6 .cv-sidebar .cv-profile-pic { border: 4px solid #ffc107; }
.professional-layout.template6 .cv-sidebar .cv-section-title { color: #ffc107; border-bottom-color: #ffeeba; }
.professional-layout.template6 .cv-sidebar .cv-skill-item { background-color: #ffeeba; color: #ffc107; } /* Changed from #ffc107 to #664d03 for better contrast if needed */
.professional-layout.template6 .cv-main-content .cv-section-title { color: #d39e00; border-bottom-color: #fff3cd; font-family: 'Arial', sans-serif; font-weight: 700; }
.professional-layout.template6 #cv-container { font-family: 'Arial', sans-serif; color: #343a40; }

.professional-layout.template7 .cv-header.professional-layout{ background-color: #0056b3; color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template7 .cv-name { color: #fff; font-family: 'Arial Black', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template7 .cv-title { color: #cce5ff; font-family: 'Arial Black', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template7 .cv-contact-info { border-top: 1px solid #004085; }
.professional-layout.template7 .cv-contact-item { color: #ffffff; }
.professional-layout.template7 .cv-contact-item i { color: #cce5ff; }
.professional-layout.template7 .cv-sidebar { background-color: #f8f9fa; color: #495057; font-family: 'Arial', sans-serif; border-right: 5px solid #0056b3; }
.professional-layout.template7[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #0056b3; }
.professional-layout.template7 .cv-sidebar .cv-profile-pic { border: 4px solid #0056b3; }
.professional-layout.template7 .cv-sidebar .cv-section-title { color: #0056b3; border-bottom-color: #cce5ff; }
.professional-layout.template7 .cv-sidebar .cv-skill-item { background-color: #cce5ff; color: #0056b3; }
.professional-layout.template7 .cv-main-content .cv-section-title { color: #004085; border-bottom-color: #a2cbfd; font-family: 'Arial', sans-serif; font-weight: 700; }
.professional-layout.template7 #cv-container { font-family: 'Arial', sans-serif; color: #212121; }

.professional-layout.template8 .cv-header.professional-layout{ background-color: #343a40; color: #ffffff; /* Corrected color for text */ padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template8 .cv-name { color: #fff; font-family: 'Segoe UI', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template8 .cv-title { color: #dee2e6; font-family: 'Segoe UI', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template8 .cv-contact-info { border-top: 1px solid #6c757d; } /* Slightly lighter border */
.professional-layout.template8 .cv-contact-item { color: #fff; }
.professional-layout.template8 .cv-contact-item i { color: #dee2e6; }
.professional-layout.template8 .cv-sidebar { background-color: #495057; /* Darker sidebar */ color: #f8f9fa; font-family: 'Segoe UI', sans-serif; border-right: 5px solid #343a40; }
.professional-layout.template8[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #343a40; }
.professional-layout.template8 .cv-sidebar .cv-profile-pic { border: 4px solid #f8f9fa; }
.professional-layout.template8 .cv-sidebar .cv-section-title { color: #f8f9fa; border-bottom-color: #6c757d; }
.professional-layout.template8 .cv-sidebar .cv-skill-item { background-color: #6c757d; color: #fff; }
.professional-layout.template8 .cv-main-content .cv-section-title { color: #343a40; border-bottom-color: #ced4da; font-family: 'Segoe UI', sans-serif; font-weight: 700; }
.professional-layout.template8 #cv-container { font-family: 'Segoe UI', sans-serif; color: #212121; }

.professional-layout.template9 .cv-header.professional-layout{ background: linear-gradient(to right, #0056b3, #004085); color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template9 .cv-name { color: #fff; font-family: 'Helvetica', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template9 .cv-title { color: #a2cbfd; font-family: 'Helvetica', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template9 .cv-contact-info { border-top: 1px solid #004085; }
.professional-layout.template9 .cv-contact-item { color: #ffffff; }
.professional-layout.template9 .cv-contact-item i { color: #a2cbfd; }
.professional-layout.template9 .cv-sidebar { background-color: #e9ecef; color: #495057; font-family: 'Helvetica', sans-serif; border-right: 5px solid #0056b3; }
.professional-layout.template9[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #0056b3; }
.professional-layout.template9 .cv-sidebar .cv-profile-pic { border: 4px solid #0056b3; }
.professional-layout.template9 .cv-sidebar .cv-section-title { color: #0056b3; border-bottom-color: #ced4da; }
.professional-layout.template9 .cv-sidebar .cv-skill-item { background-color: #ced4da; color: #0056b3; }
.professional-layout.template9 .cv-main-content .cv-section-title { color: #004085; border-bottom-color: #cce5ff; font-family: 'Helvetica', sans-serif; font-weight: 700; }
.professional-layout.template9 #cv-container { font-family: 'Helvetica', sans-serif; color: #212121; }

.professional-layout.template10 .cv-header.professional-layout{ background-color: #555; color: #ffffff; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template10 .cv-name { color: #fff; font-family: 'Arial', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template10 .cv-title { color: #ccc; font-family: 'Arial', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template10 .cv-contact-info { border-top: 1px solid #777; }
.professional-layout.template10 .cv-contact-item { color: #ffffff; }
.professional-layout.template10 .cv-contact-item i { color: #ccc; }
.professional-layout.template10 .cv-sidebar { background-color: #f0f0f0; color: #495057; font-family: 'Arial', sans-serif; border-right: 5px solid #555; }
.professional-layout.template10[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #555; }
.professional-layout.template10 .cv-sidebar .cv-profile-pic { border: 4px solid #555; }
.professional-layout.template10 .cv-sidebar .cv-section-title { color: #555; border-bottom-color: #ccc; }
.professional-layout.template10 .cv-sidebar .cv-skill-item { background-color: #ccc; color: #333; }
.professional-layout.template10 .cv-main-content .cv-section-title { color: #555; border-bottom-color: #ddd; font-family: 'Arial', sans-serif; font-weight: 700; }
.professional-layout.template10 #cv-container { font-family: 'Arial', sans-serif; color: #343a40; }

.professional-layout.template11 .cv-header.professional-layout{ background-color: #eaf4f4; color: #004d40; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template11 .cv-name { color: #00332c; font-family: 'PT Sans', sans-serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template11 .cv-title { color: #00796b; font-family: 'PT Sans', sans-serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template11 .cv-contact-info { border-top: 1px solid #00796b; }
.professional-layout.template11 .cv-contact-item { color: #004d40; }
.professional-layout.template11 .cv-contact-item i { color: #00796b; }
.professional-layout.template11 .cv-sidebar { background-color: #f8f9fa; color: #495057; font-family: 'PT Sans', sans-serif; border-right: 5px solid #004d40; }
.professional-layout.template11[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #004d40; }
.professional-layout.template11 .cv-sidebar .cv-profile-pic { border: 4px solid #004d40; }
.professional-layout.template11 .cv-sidebar .cv-section-title { color: #004d40; border-bottom-color: #b2dfdb; }
.professional-layout.template11 .cv-sidebar .cv-skill-item { background-color: #b2dfdb; color: #004d40; }
.professional-layout.template11 .cv-main-content .cv-section-title { color: #004d40; border-bottom-color: #eaf4f4; font-family: 'PT Sans', sans-serif; font-weight: 700; }
.professional-layout.template11 #cv-container { font-family: 'PT Sans', sans-serif; color: #212121; }

.professional-layout.template12 .cv-header.professional-layout{ background-color: #f0e0d4; color: #7f4f24; padding: 30px 20px; border-radius: 8px 8px 0 0; grid-area: header;}
.professional-layout.template12 .cv-name { color: #633c1c; font-family: 'Georgia', serif; font-size: 2.8em; margin-bottom: 5px; font-weight: 900; }
.professional-layout.template12 .cv-title { color: #a27b5c; font-family: 'Georgia', serif; font-size: 1.3em; font-weight: 400; }
.professional-layout.template12 .cv-contact-info { border-top: 1px solid #a27b5c; }
.professional-layout.template12 .cv-contact-item { color: #7f4f24; }
.professional-layout.template12 .cv-contact-item i { color: #a27b5c; }
.professional-layout.template12 .cv-sidebar { background-color: #f8f9fa; color: #5a5251; font-family: 'Georgia', serif; border-right: 5px solid #7f4f24; }
.professional-layout.template12[dir="ltr"] .cv-sidebar { border-right: none; border-left: 5px solid #7f4f24; }
.professional-layout.template12 .cv-sidebar .cv-profile-pic { border: 4px solid #7f4f24; }
.professional-layout.template12 .cv-sidebar .cv-section-title { color: #7f4f24; border-bottom-color: #eaddd7; }
.professional-layout.template12 .cv-sidebar .cv-skill-item { background-color: #eaddd7; color: #7f4f24; }
.professional-layout.template12 .cv-main-content .cv-section-title { color: #5a5251; border-bottom-color: #f0e0d4; font-family: 'Georgia', serif; font-weight: 700; }
.professional-layout.template12 #cv-container { font-family: 'Georgia', serif; color: #343a40; }


/* --- AST Layout Templates --- */
/* (Your existing .ast-layout.template1 to template12 styles go here) */
/* Example for one, apply to all */
.ast-layout #cv-container { /* Global for ast layout, layout div below handles structure */
}
.ast-layout .cv-sidebar {
    width: 250px; /* overridden by print (80mm) */
    padding: 20px;
    flex-shrink: 0;
    border-radius: 8px 0 0 8px;
}
.ast-layout[dir="rtl"] .cv-sidebar { border-radius: 0 8px 8px 0; }
.ast-layout .cv-main-content { flex-grow: 1; padding: 20px; }

.ast-layout.template1 .cv-sidebar { background-color: #00acc1; color: #ffffff; font-family: 'Segoe UI', sans-serif; }
.ast-layout.template1 .cv-sidebar .cv-section { background-color: #00acc1; color: #ffffff; font-family: 'Segoe UI', sans-serif; } /* Should sections inside sidebar also have this? */
.ast-layout.template1 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #00838f; font-weight: 700; }
.ast-layout.template1 .cv-sidebar .cv-contact-item { margin-bottom: 10px; color: #e0f7fa; }
.ast-layout.template1 .cv-sidebar .cv-contact-item i { color: #4dd0e1; }
.ast-layout.template1 .cv-sidebar .cv-contact-item p { color: #e0f7fa; }
.ast-layout.template1 .cv-sidebar .cv-skill-item { background-color: #4dd0e1; color: #004d40; padding: 5px 10px; margin: 5px 0; border-radius: 3px; font-size: 0.9em; }
.ast-layout.template1 .cv-sidebar .cv-language-list li { color: #e0f7fa; }
.ast-layout.template1 .cv-sidebar .cv-reference-item h4,
.ast-layout.template1 .cv-sidebar .cv-reference-item p { color: #e0f7fa; }
.ast-layout.template1 .cv-main-content .cv-header.two-col-main { border-bottom: 4px solid #00acc1; }
.ast-layout.template1 .cv-main-content .cv-name { color: #006064; font-family: 'Segoe UI', sans-serif; font-weight: 900; font-size: 1.8em; }
.ast-layout.template1 .cv-main-content .cv-title { color: #00acc1; font-family: 'Segoe UI', sans-serif; font-weight: 400; font-size: 1em; }
.ast-layout.template1 .cv-main-content .cv-section-title { color: #00acc1; border-bottom-color: #e0f7fa; font-family: 'Segoe UI', sans-serif; font-weight: 700; }
.ast-layout.template1 #cv-container { font-family: 'Segoe UI', sans-serif; color: #343a40; }

/* ... (Repeat for template2 to template12 for ast-layout) ... */
/* AST Template 2 */
.ast-layout.template2 .cv-sidebar { background-color: #ff9800; color: #ffffff; font-family: 'Roboto', sans-serif; }
.ast-layout.template2 .cv-sidebar .cv-section { background-color: #ff9800; color: #ffffff; }
.ast-layout.template2 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #f57c00; }
.ast-layout.template2 .cv-sidebar .cv-contact-item { color: #fff3e0; }
.ast-layout.template2 .cv-sidebar .cv-contact-item i { color: #ffb74d; }
.ast-layout.template2 .cv-sidebar .cv-contact-item p { color: #fff3e0; }
.ast-layout.template2 .cv-sidebar .cv-skill-item { background-color: #ffb74d; color: #e65100; }
.ast-layout.template2 .cv-sidebar .cv-language-list li { color: #fff3e0; }
.ast-layout.template2 .cv-sidebar .cv-reference-item h4, .ast-layout.template2 .cv-sidebar .cv-reference-item p { color: #fff3e0; }
.ast-layout.template2 .cv-main-content .cv-header.two-col-main { border-bottom-color: #ff9800; }
.ast-layout.template2 .cv-main-content .cv-name { color: #e65100; }
.ast-layout.template2 .cv-main-content .cv-title { color: #ff9800; }
.ast-layout.template2 .cv-main-content .cv-section-title { color: #ff9800; border-bottom-color: #fff3e0; }
.ast-layout.template2 #cv-container { font-family: 'Roboto', sans-serif; }

/* AST Template 3 */
.ast-layout.template3 .cv-sidebar { background-color: #9c27b0; color: #ffffff; font-family: 'Montserrat', sans-serif; }
.ast-layout.template3 .cv-sidebar .cv-section { background-color: #9c27b0; color: #ffffff; }
.ast-layout.template3 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #7b1fa2; }
.ast-layout.template3 .cv-sidebar .cv-contact-item { color: #f3e5f5; }
.ast-layout.template3 .cv-sidebar .cv-contact-item i { color: #e1bee7; }
.ast-layout.template3 .cv-sidebar .cv-contact-item p { color: #f3e5f5; }
.ast-layout.template3 .cv-sidebar .cv-skill-item { background-color: #e1bee7; color: #4a148c; }
.ast-layout.template3 .cv-sidebar .cv-language-list li { color: #f3e5f5; }
.ast-layout.template3 .cv-sidebar .cv-reference-item h4, .ast-layout.template3 .cv-sidebar .cv-reference-item p { color: #f3e5f5; }
.ast-layout.template3 .cv-main-content .cv-header.two-col-main { border-bottom-color: #9c27b0; }
.ast-layout.template3 .cv-main-content .cv-name { color: #4a148c; }
.ast-layout.template3 .cv-main-content .cv-title { color: #9c27b0; }
.ast-layout.template3 .cv-main-content .cv-section-title { color: #9c27b0; border-bottom-color: #f3e5f5; }
.ast-layout.template3 #cv-container { font-family: 'Montserrat', sans-serif; color: #212121; }

/* AST Template 4 */
.ast-layout.template4 .cv-sidebar { background-color: #4caf50; color: #ffffff; font-family: 'Open Sans', sans-serif; }
.ast-layout.template4 .cv-sidebar .cv-section { background-color: #4caf50; color: #ffffff; }
.ast-layout.template4 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #388e3c; }
.ast-layout.template4 .cv-sidebar .cv-contact-item { color: #e8f5e9; }
.ast-layout.template4 .cv-sidebar .cv-contact-item i { color: #c8e6c9; }
.ast-layout.template4 .cv-sidebar .cv-contact-item p { color: #e8f5e9; }
.ast-layout.template4 .cv-sidebar .cv-skill-item { background-color: #c8e6c9; color: #1b5e20; }
.ast-layout.template4 .cv-sidebar .cv-language-list li { color: #e8f5e9; }
.ast-layout.template4 .cv-sidebar .cv-reference-item h4, .ast-layout.template4 .cv-sidebar .cv-reference-item p { color: #e8f5e9; }
.ast-layout.template4 .cv-main-content .cv-header.two-col-main { border-bottom-color: #4caf50; }
.ast-layout.template4 .cv-main-content .cv-name { color: #1b5e20; }
.ast-layout.template4 .cv-main-content .cv-title { color: #4caf50; }
.ast-layout.template4 .cv-main-content .cv-section-title { color: #4caf50; border-bottom-color: #e8f5e9; }
.ast-layout.template4 #cv-container { font-family: 'Open Sans', sans-serif; color: #212121; }

/* AST Template 5 */
.ast-layout.template5 .cv-sidebar { background-color: #03a9f4; color: #ffffff; font-family: 'Lato', sans-serif; }
.ast-layout.template5 .cv-sidebar .cv-section { background-color: #03a9f4; color: #ffffff; }
.ast-layout.template5 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #0288d1; }
.ast-layout.template5 .cv-sidebar .cv-contact-item { color: #e1f5fe; }
.ast-layout.template5 .cv-sidebar .cv-contact-item i { color: #b3e5fc; }
.ast-layout.template5 .cv-sidebar .cv-contact-item p { color: #e1f5fe; }
.ast-layout.template5 .cv-sidebar .cv-skill-item { background-color: #b3e5fc; color: #01579b; }
.ast-layout.template5 .cv-sidebar .cv-language-list li { color: #e1f5fe; }
.ast-layout.template5 .cv-sidebar .cv-reference-item h4, .ast-layout.template5 .cv-sidebar .cv-reference-item p { color: #e1f5fe; }
.ast-layout.template5 .cv-main-content .cv-header.two-col-main { border-bottom-color: #03a9f4; }
.ast-layout.template5 .cv-main-content .cv-name { color: #01579b; }
.ast-layout.template5 .cv-main-content .cv-title { color: #03a9f4; }
.ast-layout.template5 .cv-main-content .cv-section-title { color: #03a9f4; border-bottom-color: #e1f5fe; }
.ast-layout.template5 #cv-container { font-family: 'Lato', sans-serif; color: #212121; }

/* AST Template 6 */
.ast-layout.template6 .cv-sidebar { background-color: #ff5722; color: #ffffff; font-family: 'Ubuntu', sans-serif; }
.ast-layout.template6 .cv-sidebar .cv-section { background-color: #ff5722; color: #ffffff; }
.ast-layout.template6 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #f4511e; }
.ast-layout.template6 .cv-sidebar .cv-contact-item { color: #fbe9e7; }
.ast-layout.template6 .cv-sidebar .cv-contact-item i { color: #ffccbc; }
.ast-layout.template6 .cv-sidebar .cv-contact-item p { color: #fbe9e7; }
.ast-layout.template6 .cv-sidebar .cv-skill-item { background-color: #ffccbc; color: #bf360c; }
.ast-layout.template6 .cv-sidebar .cv-language-list li { color: #fbe9e7; }
.ast-layout.template6 .cv-sidebar .cv-reference-item h4, .ast-layout.template6 .cv-sidebar .cv-reference-item p { color: #fbe9e7; }
.ast-layout.template6 .cv-main-content .cv-header.two-col-main { border-bottom-color: #ff5722; }
.ast-layout.template6 .cv-main-content .cv-name { color: #bf360c; }
.ast-layout.template6 .cv-main-content .cv-title { color: #ff5722; }
.ast-layout.template6 .cv-main-content .cv-section-title { color: #ff5722; border-bottom-color: #fbe9e7; }
.ast-layout.template6 #cv-container { font-family: 'Ubuntu', sans-serif; color: #212121; }

/* AST Template 7 */
.ast-layout.template7 .cv-sidebar { background-color: #795548; color: #ffffff; font-family: 'Quicksand', sans-serif; }
.ast-layout.template7 .cv-sidebar .cv-section { background-color: #795548; color: #ffffff; }
.ast-layout.template7 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #5d4037; }
.ast-layout.template7 .cv-sidebar .cv-contact-item { color: #efebe9; }
.ast-layout.template7 .cv-sidebar .cv-contact-item i { color: #d7ccc8; }
.ast-layout.template7 .cv-sidebar .cv-contact-item p { color: #efebe9; }
.ast-layout.template7 .cv-sidebar .cv-skill-item { background-color: #d7ccc8; color: #3e2723; }
.ast-layout.template7 .cv-sidebar .cv-language-list li { color: #efebe9; }
.ast-layout.template7 .cv-sidebar .cv-reference-item h4, .ast-layout.template7 .cv-sidebar .cv-reference-item p { color: #efebe9; }
.ast-layout.template7 .cv-main-content .cv-header.two-col-main { border-bottom-color: #795548; }
.ast-layout.template7 .cv-main-content .cv-name { color: #3e2723; }
.ast-layout.template7 .cv-main-content .cv-title { color: #795548; }
.ast-layout.template7 .cv-main-content .cv-section-title { color: #795548; border-bottom-color: #efebe9; }
.ast-layout.template7 #cv-container { font-family: 'Quicksand', sans-serif; color: #5a5251; }

/* AST Template 8 */
.ast-layout.template8 .cv-sidebar { background-color: #607d8b; color: #ffffff; font-family: 'Noto Serif', serif; }
.ast-layout.template8 .cv-sidebar .cv-section { background-color: #607d8b; color: #ffffff; }
.ast-layout.template8 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #455a64; }
.ast-layout.template8 .cv-sidebar .cv-contact-item { color: #eceff1; }
.ast-layout.template8 .cv-sidebar .cv-contact-item i { color: #cfd8dc; }
.ast-layout.template8 .cv-sidebar .cv-contact-item p { color: #eceff1; }
.ast-layout.template8 .cv-sidebar .cv-skill-item { background-color: #cfd8dc; color: #263238; }
.ast-layout.template8 .cv-sidebar .cv-language-list li { color: #eceff1; }
.ast-layout.template8 .cv-sidebar .cv-reference-item h4, .ast-layout.template8 .cv-sidebar .cv-reference-item p { color: #eceff1; }
.ast-layout.template8 .cv-main-content .cv-header.two-col-main { border-bottom-color: #607d8b; }
.ast-layout.template8 .cv-main-content .cv-name { color: #263238; }
.ast-layout.template8 .cv-main-content .cv-title { color: #607d8b; }
.ast-layout.template8 .cv-main-content .cv-section-title { color: #607d8b; border-bottom-color: #eceff1; }
.ast-layout.template8 #cv-container { font-family: 'Noto Serif', serif; color: #37474f; }

/* AST Template 9 */
.ast-layout.template9 .cv-sidebar { background-color: #e91e63; color: #ffffff; font-family: 'Playfair Display', serif; }
.ast-layout.template9 .cv-sidebar .cv-section { background-color: #e91e63; color: #ffffff; }
.ast-layout.template9 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #c2185b; }
.ast-layout.template9 .cv-sidebar .cv-contact-item { color: #fce4ec; }
.ast-layout.template9 .cv-sidebar .cv-contact-item i { color: #f8bbd0; }
.ast-layout.template9 .cv-sidebar .cv-contact-item p { color: #fce4ec; }
.ast-layout.template9 .cv-sidebar .cv-skill-item { background-color: #f8bbd0; color: #880e4f; }
.ast-layout.template9 .cv-sidebar .cv-language-list li { color: #fce4ec; }
.ast-layout.template9 .cv-sidebar .cv-reference-item h4, .ast-layout.template9 .cv-sidebar .cv-reference-item p { color: #fce4ec; }
.ast-layout.template9 .cv-main-content .cv-header.two-col-main { border-bottom-color: #e91e63; }
.ast-layout.template9 .cv-main-content .cv-name { color: #880e4f; }
.ast-layout.template9 .cv-main-content .cv-title { color: #e91e63; }
.ast-layout.template9 .cv-main-content .cv-section-title { color: #e91e63; border-bottom-color: #fce4ec; }
.ast-layout.template9 #cv-container { font-family: 'Playfair Display', serif; color: #212121; }

/* AST Template 10 */
.ast-layout.template10 .cv-sidebar { background-color: #009688; color: #ffffff; font-family: 'PT Sans', sans-serif; }
.ast-layout.template10 .cv-sidebar .cv-section { background-color: #009688; color: #ffffff; }
.ast-layout.template10 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #00796b; }
.ast-layout.template10 .cv-sidebar .cv-contact-item { color: #e0f2f7; }
.ast-layout.template10 .cv-sidebar .cv-contact-item i { color: #b2dfdb; }
.ast-layout.template10 .cv-sidebar .cv-contact-item p { color: #e0f2f7; }
.ast-layout.template10 .cv-sidebar .cv-skill-item { background-color: #b2dfdb; color: #004d40; }
.ast-layout.template10 .cv-sidebar .cv-language-list li { color: #e0f2f7; }
.ast-layout.template10 .cv-sidebar .cv-reference-item h4, .ast-layout.template10 .cv-sidebar .cv-reference-item p { color: #e0f2f7; }
.ast-layout.template10 .cv-main-content .cv-header.two-col-main { border-bottom-color: #009688; }
.ast-layout.template10 .cv-main-content .cv-name { color: #004d40; }
.ast-layout.template10 .cv-main-content .cv-title { color: #009688; }
.ast-layout.template10 .cv-main-content .cv-section-title { color: #009688; border-bottom-color: #e0f2f7; }
.ast-layout.template10 #cv-container { font-family: 'PT Sans', sans-serif; color: #212121; }

/* AST Template 11 */
.ast-layout.template11 .cv-sidebar { background-color: #8bc34a; color: #ffffff; font-family: 'Verdana', sans-serif; }
.ast-layout.template11 .cv-sidebar .cv-section { background-color: #8bc34a; color: #ffffff; }
.ast-layout.template11 .cv-sidebar .cv-section-title { color: #ffffff; border-bottom-color: #689f38; }
.ast-layout.template11 .cv-sidebar .cv-contact-item { color: #f1f8e9; }
.ast-layout.template11 .cv-sidebar .cv-contact-item i { color: #dcedc8; }
.ast-layout.template11 .cv-sidebar .cv-contact-item p { color: #f1f8e9; }
.ast-layout.template11 .cv-sidebar .cv-skill-item { background-color: #dcedc8; color: #33691e; }
.ast-layout.template11 .cv-sidebar .cv-language-list li { color: #f1f8e9; }
.ast-layout.template11 .cv-sidebar .cv-reference-item h4, .ast-layout.template11 .cv-sidebar .cv-reference-item p { color: #f1f8e9; }
.ast-layout.template11 .cv-main-content .cv-header.two-col-main { border-bottom-color: #8bc34a; }
.ast-layout.template11 .cv-main-content .cv-name { color: #33691e; }
.ast-layout.template11 .cv-main-content .cv-title { color: #8bc34a; }
.ast-layout.template11 .cv-main-content .cv-section-title { color: #8bc34a; border-bottom-color: #f1f8e9; }
.ast-layout.template11 #cv-container { font-family: 'Verdana', sans-serif; color: #212121; }

/* AST Template 12 */
.ast-layout.template12 .cv-sidebar { background-color: #ffeb3b; color: #212121; font-family: 'Arial', sans-serif; }
.ast-layout.template12 .cv-sidebar .cv-section { background-color: #ffeb3b; color: #212121; }
.ast-layout.template12 .cv-sidebar .cv-section-title { color: #f57f17; border-bottom-color: #fbc02d; }
.ast-layout.template12 .cv-sidebar .cv-contact-item { color: #212121; }
.ast-layout.template12 .cv-sidebar .cv-contact-item i { color: #fbc02d; }
.ast-layout.template12 .cv-sidebar .cv-contact-item p { color: #212121; }
.ast-layout.template12 .cv-sidebar .cv-skill-item { background-color: #fff9c4; color: #f57f17; }
.ast-layout.template12 .cv-sidebar .cv-language-list li { color: #212121; }
.ast-layout.template12 .cv-sidebar .cv-reference-item h4, .ast-layout.template12 .cv-sidebar .cv-reference-item p { color: #212121; }
.ast-layout.template12 .cv-main-content .cv-header.two-col-main { border-bottom-color: #ffeb3b; }
.ast-layout.template12 .cv-main-content .cv-name { color: #f57f17; }
.ast-layout.template12 .cv-main-content .cv-title { color: #ffeb3b; } /* Should be #f57f17 for text, #ffeb3b for accents? */
.ast-layout.template12 .cv-main-content .cv-section-title { color: #f57f17; border-bottom-color: #fffde7; }
.ast-layout.template12 .cv-profile-pic { border: 4px solid #212121; }
.ast-layout.template12 #cv-container { font-family: 'Arial', sans-serif; color: #343a40; }


/* --- Responsive Adjustments for Mobile Screens (On-Screen Preview) --- */
/* These affect how the CV looks in #cv-preview-area on small screens, */
/* but should NOT affect the PDF generation if print/capture styles are strong. */
@media (max-width: 768px) {
    /* Adjust CV container preview on mobile */
    #cv-container {
        min-height: auto; /* اجعل الارتفاع مرنًا أكثر في المعاينة على الجوال */
    }

    /* Stack columns in layouts for mobile preview */
    .cv-two-column-layout, .ast-layout, .cv-professional-layout {
        flex-direction: column !important; /* Stack columns */
        gap: 0 !important; /* No gap when stacked */
    }
    .cv-professional-layout { /* Reset grid for stacking */
        display: flex !important;
        flex-direction: column !important;
    }
    .cv-sidebar, .cv-main-content,
    .cv-two-column-layout .cv-sidebar, .ast-layout .cv-sidebar,
    .cv-professional-layout .cv-sidebar,
    .cv-two-column-layout .cv-main-content, .ast-layout .cv-main-content,
    .cv-professional-layout .cv-main-content {
        width: 100% !important; /* Full width when stacked */
        max-width: 100% !important;
        padding: 15px !important; /* Padding for stacked view */
        min-height: auto !important;
    }
    .cv-professional-layout .cv-header.professional-layout { /* Ensure professional header is also full width */
        width: 100% !important;
    }

    /* Font sizes for mobile preview */
    body, .cv-section, .cv-contact-info, .cv-experience-item, .cv-education-item,
    .cv-skill-list, .cv-language-list, .cv-reference-item {
        font-size: 0.9em !important; /* Slightly larger base for mobile readability */
        line-height: 1.5 !important;
    }
    .cv-name { font-size: 1.8em !important; }
    .cv-title { font-size: 1.1em !important; }
    .cv-section-title { font-size: 1.2em !important; margin-bottom: 10px !important; padding-bottom: 5px !important; }
    .cv-contact-item { font-size: 0.9em !important; flex-wrap: wrap; justify-content: center; }
    .cv-contact-item i { width: 16px !important; height: 16px !important; font-size: 0.9em !important; margin: 0 5px !important; }
    .cv-profile-pic { width: 100px !important; height: 100px !important; margin: 0 auto 15px auto !important; }
    .cv-skill-list, .cv-language-list { column-count: 1 !important; text-align: center !important;}
    .cv-skill-item { margin: 5px auto !important; display: inline-block !important; width: auto; font-size: 0.85em !important;}
}

@media (max-width: 400px) { /* Very small screens */
    #cv-container { padding: 3mm; }
    .cv-name { font-size: 1.6em !important; }
    .cv-title { font-size: 1em !important; }
    .cv-section-title { font-size: 1.1em !important; }
    .cv-profile-pic { width: 80px !important; height: 80px !important; }
    .cv-contact-item { font-size: 0.8em !important; }
    .cv-job-title, .cv-degree { font-size: 0.95em !important; }
    .cv-company, .cv-institution, .cv-duration { font-size: 0.85em !important; }
    .cv-experience-item p { font-size: 0.85em !important; line-height: 1.4 !important; }
    .cv-skill-item { font-size: 0.8em !important; padding: 4px 8px !important; }
}


/* Payment Modal/Page Styles (Mostly Unchanged) */
#payment-modal .popup-box { text-align: center; padding: 20px; }
.qr-payment-inputs-scroll { flex-grow: 1; overflow-y: auto; margin-bottom: 20px; box-sizing: border-box; padding-right: 15px; }
body[dir="ltr"] .qr-payment-inputs-scroll { padding-right: 0; padding-left: 15px; }
#paypal-button-container { margin-bottom: 20px; width: 100%; display: flex; justify-content: center; }
#submit-payment-proof { margin-bottom: 10px; }
#qr-payment-result { margin-top: 10px; }
#qr-payment-image { max-width: 200px; margin-bottom: 15px; display: none; margin-left: auto; margin-right: auto; }
#manual-payment-form { margin-top: 20px; display: none; text-align: initial; }

/* Section: Why Resail CV Builder (Unchanged) */
#why-resail { background-color: #fff; }
.feature-card { text-align: center; padding: 30px; border-radius: 8px; height: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0); transition: transform 0.3s ease, box-shadow 0.3s ease; background-color: #f8f9fa00; }
.feature-card:hover { transform: translateY(-10px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
.feature-icon { width: 200px; height: 200px; object-fit: contain; border-radius: 15px; filter: drop-shadow(-10px 10px 10px rgba(0,0,0,0.5)); }
.feature-card h3 { font-size: 1.3em; color: #007bff; margin-bottom: 10px; text-shadow: -10px 10px 10px rgba(0,0,0,0.5); }
.feature-card p { font-size: 1em; color: #555; line-height: 1.6; }


/* --- Print styles (VERY IMPORTANT for PDF output and Ctrl+P) --- */
/* style.css */

/* ... (الجزء العلوي من الملف بدون تغيير) ... */

/* --- Print styles (VERY IMPORTANT for PDF output and Ctrl+P) --- */
@media print {
    /* --- إخفاء عناصر واجهة المستخدم والتحكم - مشترك للجميع --- */
    body > nav, /* Navbar */
    body > footer, /* Footer */
    body > header.site-header, /* Landing page header */
    #loading-overlay, /* Loading overlay */
    .language-toggle, /* Language toggle button */
    .progress-container /* Progress bar */
    {
        display: none !important;
    }

    /* إخفاء كل الصفحات ما عدا صفحة معاينة السيرة الذاتية إذا كانت هي النشطة */
    .page-section:not(#cv-preview-page),
    .page-section:not(.active-page) {
        display: none !important;
    }

    /* إذا كانت صفحة المعاينة هي النشطة، طبق هذه الأنماط */
    #cv-preview-page.active-page, #cv-preview-page {
        position: static !important;
        display: block !important;
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        background-color: transparent !important;
        box-shadow: none !important;
        overflow: visible !important;
    }
    #cv-preview-page.active-page #cv-preview-area {
        padding: 0 !important;
        margin: 0 !important;
        max-height: none !important;
        overflow: visible !important;
        background-color: transparent !important;
    }

    /* إخفاء أزرار التحكم داخل صفحة معاينة السيرة الذاتية */
    #cv-preview-page .d-flex.justify-content-center.mt-4 {
        display: none !important;
    }
    .remove-field { display: none !important; }

    /* --- تنسيق حاوية السيرة الذاتية الأساسية (A4) للطباعة - مشترك للجميع --- */
    #cv-container {
        display: flex !important;
        flex-direction: column !important;
        flex-grow: 1 !important;
        width: 210mm !important; /* عرض A4 */
        min-height: 297mm !important; /* ارتفاع A4 */
        height: auto !important; /* السماح بالنمو لمحتوى متعدد الصفحات */
        margin: 0 auto !important;
        box-shadow: none !important;
        overflow: visible !important;
        page-break-before: auto !important;
        page-break-after: auto !important;
        page-break-inside: auto !important; /* Allow page breaks inside container */
        position: static !important; /* لضمان الطباعة داخل المستند */
        left: auto !important;
        top: auto !important;
        z-index: auto !important;
        transform: none !important;
        max-width: none !important;
        background-color: white !important;
        color: #212529 !important;
        visibility: visible !important;
        box-sizing: border-box !important; /* مهم جداً */
    }

    /* --- تنسيق المحتوى الرئيسي للسيرة الذاتية (cv-content) - مشترك للجميع --- */
    .cv-content {
        flex-grow: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        box-sizing: border-box !important;
        padding: 0 !important;
        overflow: visible !important;
        min-height: 100% !important; /* لضمان تمدد المحتوى ليشغل الصفحة كاملة */
        height: 100% !important;
    }

    /* --- أنماط الطباعة لسطح المكتب (body.is-desktop) --- */
    body.is-desktop #cv-container {
        font-size: 10pt !important;
        line-height: 1.4 !important;
    }

    /* Standard and AST layouts for desktop (sidebar on right for RTL, left for LTR) */
    body.is-desktop .cv-two-column-layout,
    body.is-desktop .ast-layout {
        display: flex !important; /* Use flex for print */
        flex-grow: 1 !important;
        gap: 8mm !important;
        page-break-inside: auto !important; /* Changed to auto to allow page breaks for the whole layout */
        min-height: 100% !important;
        height: 100% !important;
        flex-wrap: nowrap !important;
        /* Sidebar on right for RTL, left for LTR */
        flex-direction: var(--print-flex-direction, row) !important; /* Use CSS variable for dynamic direction */
    }

    /* Professional layout-specific grid areas for desktop (sidebar direction based on language) */
    body.is-desktop .cv-professional-layout {
        display: grid !important;
        grid-template-rows: auto 1fr !important;
        gap: 8mm !important;
        min-height: 100% !important;
        height: 100% !important;
        page-break-inside: auto !important; /* Changed to auto */
        /* Dynamic columns and areas based on direction */
        grid-template-columns: var(--print-grid-columns, 80mm 1fr) !important;
        grid-template-areas:
            "header header"
            var(--print-grid-areas, "sidebar main") !important;
    }


    /* Sidebar and Main Content for Desktop */
    body.is-desktop .cv-sidebar,
    body.is-desktop .cv-main-content {
        overflow: visible !important;
        page-break-inside: avoid !important; /* مهم: منع كسر المحتوى داخل الأعمدة */
        padding: 8mm !important;
        width: auto !important; /* السماح للعرض بأن يتم تحديده بواسطة grid */
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important; /* يبدأ المحتوى من الأعلى */
        min-height: 100% !important; /* لضمان امتداد الأعمدة على طول الصفحة */
        height: 100% !important;
    }
    body.is-desktop .cv-two-column-layout .cv-sidebar,
    body.is-desktop .ast-layout .cv-sidebar,
    body.is-desktop .cv-professional-layout .cv-sidebar {
        width: 80mm !important; /* عرض ثابت للشريط الجانبي في الطباعة */
    }


    /* --- أنماط الطباعة للجوال (body.is-mobile) --- */
    body.is-mobile #cv-container {
        font-size: 9pt !important; /* خط أصغر قليلاً */
        line-height: 1.3 !important; /* تباعد أسطر أقل */
    }

    body.is-mobile .cv-two-column-layout,
    body.is-mobile .cv-professional-layout,
    body.is-mobile .ast-layout {
        display: flex !important;
        flex-direction: column !important; /* الأعمدة تتكدس عموديًا على الجوال */
        flex-grow: 1 !important;
        gap: 0 !important; /* لا فجوات عند التكدس */
        page-break-inside: auto !important;
        min-height: auto !important;
        height: auto !important;
    }
    /* إزالة مناطق الشبكة لتخطيطات الجوال المتكدسة */
    body.is-mobile .cv-professional-layout {
        grid-template-columns: none !important;
        grid-template-rows: none !important;
        grid-template-areas: none !important;
        display: flex !important; /*override grid back to flex column */
        flex-direction: column !important;
    }


    /* Sidebar and Main Content for Mobile (stacked) */
    body.is-mobile .cv-sidebar,
    body.is-mobile .cv-main-content {
        overflow: visible !important;
        padding: 6mm !important; /* حشوة أقل قليلاً */
        width: 100% !important; /* عرض كامل */
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: flex-start !important;
        min-height: auto !important;
        height: auto !important;
        border: none !important;
        box-shadow: none !important;
    }


    /* --- الأقسام الداخلية (Objective, Experience, Education, etc.) - مشترك للجميع --- */
    .cv-section {
        margin-bottom: 6mm !important;
        padding-bottom: 0 !important;
        padding-top: 0 !important;
        background-color: transparent !important;
        box-shadow: none !important;
        page-break-inside: avoid !important; /* حاسم: تجنب كسر المحتوى داخل الأقسام */
        page-break-before: auto !important;
        page-break-after: auto !important;
        flex-grow: 0 !important;
        flex-shrink: 0 !important;
    }

    .cv-section-title {
        margin-top: 5mm !important;
        margin-bottom: 4mm !important;
        padding-bottom: 2mm !important;
        border-bottom-width: 1px !important;
        font-size: 1.1em !important;
    }

    .cv-experience-item,
    .cv-education-item,
    .cv-reference-item {
        margin-bottom: 3mm !important;
        padding-bottom: 1.5mm !important;
        border-bottom: 0.5px solid #ccc !important;
        page-break-inside: avoid !important; /* تجنب كسر العناصر الفردية */
        page-break-before: auto !important;
        page-break-after: auto !important;
    }
    .cv-experience-item:last-child,
    .cv-education-item:last-child,
    .cv-reference-item:last-child {
        border-bottom: none !important;
        padding-bottom: 0;
        margin-bottom: 0;
    }

    /* --- تحسينات النص واللغة العربية للطباعة - مشترك للجميع --- */
    body, #cv-container, #cv-container * {
        word-wrap: break-word;
        overflow-wrap: break-word;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    [dir="rtl"] #cv-container p,
    [dir="rtl"] #cv-container li,
    [dir="rtl"] #cv-container h1, [dir="rtl"] #cv-container h2, [dir="rtl"] #cv-container h3, [dir="rtl"] #cv-container h4,
    [dir="rtl"] #cv-container .cv-job-title, [dir="rtl"] #cv-container .cv-degree,
    [dir="rtl"] #cv-container .cv-company, [dir="rtl"] #cv-container .cv-institution,
    [dir="rtl"] #cv-container .cv-duration, [dir="rtl"] #cv-container .cv-contact-item p,
    [dir="rtl"] #cv-container .cv-experience-item p, [dir="rtl"] #cv-container .cv-reference-item p {
        letter-spacing: 0.01em !important;
        word-spacing: 0.05em !important;
        text-align: right !important;
        line-height: 1.5 !important;
    }

    /* --- معالجة الـ End Marker للامتداد إلى نهاية الصفحة --- */
    .cv-end-marker {
        height: 1px !important;
        margin-top: auto !important;
        page-break-before: avoid !important;
        page-break-after: auto !important;
        visibility: hidden !important;
        display: block !important;
        flex-grow: 1 !important;
        min-height: 0 !important;
    }

    /* Filler div style (used by JS to help with stretching if needed, less common now with flex-grow) */
    .filler {
        page-break-inside: avoid !important;
        margin-top: auto !important;
        flex-grow: 1 !important;
        min-height: 1px !important;
        height: 1px !important;
        font-size: 1px !important;
        line-height: 1px !important;
        overflow: hidden !important;
        visibility: hidden !important;
        display: block !important;
    }

    /* العلامة المائية للطباعة - يتم التحكم في إضافتها/إزالتها بواسطة JS */
    #cv-container.watermarked {
        position: relative !important;
    }

    #cv-container.watermarked::before {
        content: var(--watermark-text, "PREVIEW - للعرض فقط") !important;
        position: absolute !important;
        top: 50% !important;
        left: 50% !important;
        width: 200% !important;
        height: 200% !important;
        transform: translate(-50%, -50%) rotate(-40deg) scale(0.9) !important;
        font-size: clamp(2.5em, 10vw, 5em) !important; /* Larger watermark size */
        color: rgba(0, 0, 0, 0.08) !important;
        font-weight: bold !important;
        text-align: center !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: none !important;
        z-index: 10000 !important;
        line-height: 1.2 !important;
        word-break: break-word !important;
        white-space: pre-wrap !important;
        opacity: 1 !important;
        overflow: hidden !important;
    }
}
/* Live Sales Notification Styles */
.sales-notification {
    position: fixed;
    bottom: 20px;
    right: 20px; /* أو left: 20px للغة الإنجليزية */
    background-color: #fff;
    color: #333;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 10001;
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
    transition: all 0.5s ease-in-out;
}

body.ltr .sales-notification {
    right: auto;
    left: 20px;
}

.sales-notification.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

/* Discount Card Styles */
.discount-section {
    text-align: center;
    border-top: 1px solid #eee;
    border-bottom: 1px solid #eee;
    padding: 20px 0;
}
.discount-card {
    display: flex;
    align-items: center;
    background-color: #f8f9fa;
    border: 2px dashed #0d6efd;
    border-radius: 10px;
    padding: 10px 15px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-width: 220px;
}
.discount-card:hover, .discount-card.selected {
    border-style: solid;
    background-color: #e9f3ff;
    transform: translateY(-3px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}
.discount-tag {
    background-color: #0d6efd;
    color: white;
    font-weight: bold;
    font-size: 1.2em;
    padding: 10px;
    border-radius: 8px;
    margin-left: 15px; /* LTR default */
}
html[dir="rtl"] .discount-tag {
    margin-left: 0;
    margin-right: 15px;
}
.discount-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
html[dir="rtl"] .discount-info {
    align-items: flex-end;
}
.discount-info .code-text {
    font-family: monospace;
    font-size: 1.1em;
    color: #333;
}
.discount-info small {
    color: #555;
}

/* Remove Discount Link Style */
.remove-discount-link {
    color: #dc3545; /* لون أحمر للإشارة إلى الحذف */
    text-decoration: underline;
    font-size: 0.9em;
    font-weight: bold;
}
.remove-discount-link:hover {
    color: #c82333; /* لون أغمق عند مرور الماوس */
}

/*
--- Promo Bar Styles (Corrected) ---
*/
.promo-bar {
    background-color: #343a40; /* لون رمادي داكن احترافي */
    color: #ffffff;
    text-align: center;
    position: fixed;   /* تعديل جوهري: استخدام fixed بدلاً من sticky */
    top: 0;
    left: 0;
    width: 100%;
    z-index: 1051;     /* رقم مرتفع جداً ليضمن ظهوره فوق كل شيء */
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    height: 40px;      /* تحديد ارتفاع ثابت للشريط */
    display: flex;
    align-items: center;
    justify-content: center;
}

.promo-bar p {
    margin: 0;
    font-weight: 500;
    font-size: 0.95em;
}

.blinking-code {
    animation: blink-animation 2.5s infinite; /* إبطاء الأنيميشن قليلاً */
    background-color: rgba(255, 193, 7, 0.2); /* خلفية صفراء خفيفة */
    color: #ffc107; /* لون أصفر للنص */
    padding: 2px 8px;
    border-radius: 5px;
    font-family: monospace;
    margin: 0 5px;
    border: 1px solid rgba(255, 193, 7, 0.5);
}

/* تعريف الأنيميشن (تأثير الوميض) */
@keyframes blink-animation {
    50% {
        background-color: #ffc107; /* وميض أصفر قوي */
        color: #000;
    }
}
    `;

// استبدل دالة الـ webhook الحالية بالكامل بهذه النسخة المحدثة
// ▼▼▼ استبدل دالة الـ webhook الحالية بالكامل بهذه النسخة المصححة ▼▼▼

app.post('/api/ls-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    console.log('[Webhook Received] Attempting to process webhook at /api/ls-webhook');
    try {
        const secret = process.env.LEMON_SQUEEZY_SECRET || "YOUR_LEMON_SQUEEZY_WEBHOOK_SECRET";
        const hmac = crypto.createHmac('sha256', secret);
        const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
        const signatureHeader = req.get('X-Signature');

        if (!signatureHeader || !crypto.timingSafeEqual(Buffer.from(signatureHeader, 'utf8'), digest)) {
            return res.status(401).send('Invalid signature.');
        }

        const payload = JSON.parse(req.body.toString());

        if (payload.meta.event_name !== 'order_created') {
            return res.status(200).send(`Event ${payload.meta.event_name} received and ignored.`);
        }

        const sessionId = payload.meta.custom_data?.session_id;

        if (!sessionId || !pendingSessions[sessionId]) {
            return res.status(404).send('Session not found.');
        }

        // ---  هنا التعديل الجوهري ---
        // 1. استرجاع بيانات السيرة الذاتية الكاملة التي أرسلتها الواجهة الأمامية
        const { data: cvData } = pendingSessions[sessionId];
        const orderData = payload.data.attributes;
        const customerEmail = orderData.user_email;
        
        // 2. استخراج كود الـ HTML الجاهز الذي تم إرساله من الواجهة الأمامية
        // بناءً على ملف script.js، يتم إرسال كود الـ HTML في متغير fullHtml
        const finalHtml = cvData.fullHtml; 
        if (!finalHtml) {
            throw new Error("Full HTML for the CV was not found in the pending session.");
        }
        
        // --- نهاية التعديل الجوهري ---

        const orderTotal = (orderData.total / 100).toFixed(2);
        const currency = orderData.currency;
        const eventId = payload.data.id;

        // إرسال حدث الشراء إلى فيسبوك (هذا الجزء سليم ويعمل)
        await sendFacebookApiEvent(
            'Purchase',
            { email: customerEmail, phone: cvData.phone || null },
            { value: parseFloat(orderTotal), currency: currency },
            eventId
        );

        // توليد الـ PDF من الـ HTML الجاهز
        let pdfBuffer;
        let browser;
        try {
            browser = await chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();
            await page.setContent(finalHtml, { waitUntil: 'networkidle' });
            pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
        } finally {
            if (browser) await browser.close();
        }

        // إرسال البيانات إلى Google Apps Script (هذا الجزء سليم ويعمل)
        const postData = new URLSearchParams();
        postData.append('name', cvData.name || 'Unnamed User');
        postData.append('email', customerEmail);
        postData.append('phoneNumber', cvData.phone || '');
        postData.append('cvTemplateCategory', cvData.templateCategory || 'Standard');
        postData.append('paymentMethod', 'Lemon Squeezy');
        postData.append('language', cvData.language || 'en');
        postData.append('pricePaid', orderTotal);
        postData.append('discountCode', orderData.discount_code || '');
        postData.append('cvPdfFileBase64', pdfBuffer.toString('base64'));
        postData.append('cvPdfFileName', `CV-${cvData.name.replace(/\s/g, '_')}.pdf`);
        
        const scriptResponse = await fetch(appsScriptUrl, {
            method: 'POST',
            body: postData,
        });

        const resultText = await scriptResponse.text();
        if (!scriptResponse.ok) {
            throw new Error(`Google Apps Script request failed with status ${scriptResponse.status}: ${resultText}`);
        }

        delete pendingSessions[sessionId];
        res.status(200).send('Webhook processed successfully.');

    } catch (error) {
        console.error('CRITICAL ERROR processing webhook:', error);
        res.status(500).send('Webhook processing error.');
    }
});





// ==========================================================
// الإصلاح رقم 2: إضافة محلل JSON العام هنا
app.use(express.json({ limit: '10mb' }));
// ==========================================================


/**
 * @route   POST /api/prepare-checkout
 * @desc    يستقبل بيانات السيرة الذاتية من الواجهة الأمامية، ويحفظها مؤقتاً، ويعيد معرف جلسة فريد.
 */
app.post('/api/prepare-checkout', (req, res) => {
    try {
        const cvData = req.body;
        if (!cvData || !cvData.name || !cvData.email) {
            return res.status(400).json({ status: 'error', message: 'Incomplete CV data provided.' });
        }

        const sessionId = uuidv4(); // إنشاء معرف فريد للجلسة
        
        // تخزين بيانات السيرة الذاتية في الذاكرة مع عمر افتراضي (مثلاً: ساعة واحدة)
        pendingSessions[sessionId] = {
            data: cvData,
            timestamp: Date.now()
        };

        console.log(`[Session Prepared] ID: ${sessionId} for user: ${cvData.email}`);

        // تنظيف الجلسات القديمة لمنع استهلاك الذاكرة (اختياري لكن موصى به)
        Object.keys(pendingSessions).forEach(id => {
            if (Date.now() - pendingSessions[id].timestamp > 3600000) { // 1 hour
                delete pendingSessions[id];
                console.log(`[Session Expired] Cleaned up session ID: ${id}`);
            }
        });

        res.status(200).json({ status: 'success', sessionId: sessionId });

    } catch (error) {
        console.error('Error in /api/prepare-checkout:', error);
        res.status(500).json({ status: 'error', message: 'Server error while preparing checkout.' });
    }
});


// في ملف server.js

app.post('/generate-cv', async (req, res) => {
    console.log('Received request with pre-built HTML.');
    
    // الآن نستقبل متغير واحد فقط وهو fullHtml
    const { fullHtml } = req.body;

    if (!fullHtml) {
        return res.status(400).json({ status: 'error', message: 'Full HTML content is missing.' });
    }

    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // **مهم جدًا:** قم بمحاكاة وسائط الشاشة لضمان تطابق الألوان والتخطيط
        await page.emulateMedia({ media: 'screen' });

        // استخدم setContent مع الـ HTML الكامل المستلم من الواجهة الأمامية
        await page.setContent(fullHtml, { waitUntil: 'networkidle' });

        // انتظر قليلاً لضمان اكتمال أي عمليات rendering أخيرة (احتياطي)
        await new Promise(resolve => setTimeout(resolve, 500));

        const pdfBuffer = await page.pdf({
            format: 'A4',
            // **مهم جدًا:** هذا الخيار هو مفتاح ظهور الألوان والخلفيات
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });

        res.json({
            status: 'success',
            base64Pdf: pdfBuffer.toString('base64'),
            message: 'PDF generated successfully from pre-built HTML.'
        });

    } catch (error) {
        console.error('Error generating PDF from pre-built HTML:', error);
        res.status(500).json({ status: 'error', message: 'Server error during PDF conversion: ' + error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});


app.listen(port, () => { // الاستماع على جميع واجهات الشبكة
    console.log(`Node.js CV PDF Generator listening on port ${port}`);
});
