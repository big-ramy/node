# 1. ابدأ من صورة Playwright الرسمية التي تحتوي على Node.js v20
# هذه الصورة تأتي مع المتصفحات وكل الاعتماديات مثبتة مسبقًا وجاهزة.
# التغيير هنا: 1.44.0 بدلاً من 1.44.1
FROM mcr.microsoft.com/playwright/node:v1.44.0-jammy

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
