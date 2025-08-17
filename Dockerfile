# 1. ابدأ من صورة Playwright الرسمية التي تحتوي على Node.js v20
# *** هذا هو السطر الذي تم تصحيحه بشكل نهائي ***
FROM mcr.microsoft.com/playwright:v1.53.1-jammy

# 2. تعيين دليل العمل داخل الحاوية
WORKDIR /app

# 3. نسخ ملفات package.json و package-lock.json أولاً
COPY package*.json ./

# 4. تثبيت تبعيات Node.js
RUN npm ci --omit=dev

# 5. نسخ باقي ملفات التطبيق إلى مجلد العمل
COPY . .

# 6. تحديد المنفذ الذي يستمع عليه تطبيقك
ENV PORT 8080

# 7. الأمر الذي يشغل تطبيقك عند بدء تشغيل الحاوية
CMD ["npm", "start"]
