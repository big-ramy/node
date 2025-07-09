# استخدم صورة Node.js رسمية (slim لتكون خفيفة الوزن)
FROM node:20-slim

# تعيين دليل العمل داخل الحاوية
WORKDIR /app

# تثبيت تبعيات نظام التشغيل اللازمة لـ Playwright ومتصفح Chromium
# هذه الخطوة حاسمة لضمان أن Playwright يمكنه تشغيل المتصفح
RUN apt-get update && apt-get install -y \
    build-essential \
    # Playwright يحتاج هذه المكتبات لتشغيل Chromium
    libatk-bridge2.0-0 \
    libgbm-dev \
    libgtk-3-0 \
    libxss1 \
    libasound2 \
    libnss3 \
    libdbus-1-3 \
    # خطوط إضافية لدعم أفضل للغة العربية وغيرها
    fontconfig \
    fonts-liberation \
    libnspr4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libcups2 \
    libfontconfig1 \
    libsqlite3-0 \
    libxi6 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxfixes3 \
    libxcursor1 \
    libxinerama1 \
    libpangocairo-1.0-0 \
    libpangoft2-1.0-0 \
    # تنظيف بعد التثبيت لتقليل حجم الصورة
    --no-install-recommends && \
rm -rf /var/lib/apt/lists/*

# نسخ ملفات package.json و package-lock.json (أو npm-shrinkwrap.json)
COPY package*.json ./

# تثبيت تبعيات Node.js (بما في ذلك Playwright)
# --omit=dev لتجنب تثبيت تبعيات التطوير
RUN npm ci --omit=dev

# تثبيت متصفحات Playwright داخل الحاوية
# هذا الأمر سيقوم بتنزيل متصفحات Chromium (وملفاتها التنفيذية)
# في المسار الذي يتوقعه Playwright
RUN npx playwright install chromium --with-deps

# نسخ باقي ملفات التطبيق إلى مجلد العمل
COPY . .

# تحديد المنفذ الذي يستمع عليه تطبيقك
# Cloud Run يتوقع أن يستمع التطبيق على المنفذ المحدد في متغير البيئة PORT (افتراضيًا 8080)
ENV PORT 8080 

# الأمر الذي يشغل تطبيقك عند بدء تشغيل الحاوية
CMD ["npm", "start"]