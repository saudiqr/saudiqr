# SAUDIOS_MASTER.md

# SaudiOS Master File

> المرجع الرسمي الوحيد لمشروع SaudiQR / SaudiOS

---

# آخر تحديث

التاريخ:
2026-06-25

الإصدار:
v0.2

الحالة:
🟢 Development

نسبة الإنجاز التقريبية:
45%

---

# Session Resume

إذا تم فتح محادثة جديدة:

اقرأ هذا الملف أولاً.

ثم أكمل مباشرة من:

Dashboard Coffee Theme Review

بدون إعادة شرح المشروع.

---

# Vision

بناء أفضل نظام تشغيل SaaS للمطاعم والكافيهات في الشرق الأوسط.

يتوسع مستقبلاً ليشمل:

* Restaurants
* Cafes
* Hotels
* Retail

---

# الاسم الحالي

SaudiQR

ملاحظة:

سيتم اختيار اسم تجاري جديد قبل الإطلاق الرسمي.

سبب التأجيل:

لا يمكن غالبًا تسجيل اسم يحتوي على Saudi أو اسم دولة/مدينة في السجل التجاري.

الاسم الداخلي للمشروع:

SaudiOS

---

# SaudiOS Philosophy

Everything is Modular.

Everything is Feature Driven.

Everything can be enabled or disabled.

Core never depends on Apps.

Apps never depend on each other.

Services are optional.

No duplicated logic.

No duplicated tables.

One Master File.

No unnecessary documentation files.

Ship v1 before expanding.

---

# Current Architecture

SaudiOS

├── Core
│   ├── Authentication
│   ├── Businesses
│   ├── Branches
│   ├── Categories
│   ├── Products
│   ├── Tables
│   ├── QR Menu
│   ├── Orders
│   └── Dashboard
│
├── Apps
│   ├── Kitchen
│   ├── Cashier
│   ├── Waiter Calls
│   ├── Bill Requests
│   ├── Reviews
│   ├── Statistics
│   ├── Loyalty
│   ├── POS
│   ├── Inventory
│   ├── Warehouse
│   ├── HR
│   ├── Accounting
│   └── AI
│
├── Services
│   ├── WhatsApp API
│   ├── SMS
│   ├── Email
│   ├── AI Credits
│   ├── Storage
│   ├── Domains
│   └── Backup
│
├── Billing
├── Wallet
├── Notifications
└── ERP

---

# Design System

Theme:
Coffee Premium

Style:
Luxury Coffee SaaS

Inspired By:
Specialty Coffee
Espresso
Crema

---

## Colors

Primary:
#C68A3D

Primary Hover:
#DEA54B

Background:
#16110E

Secondary Background:
#1C1612

Cards:
#241B16

Cards Alt:
#2A211C

Border:
#4A3425

Light Background:
#F5F0E8

Text:
#FFF8F0

Secondary Text:
#C8B6A4

Success:
#65C466

Warning:
#F0A53B

Error:
#D95C5C

---

## UI Rules

* RTL First.
* Coffee Premium is the official design language.
* Rounded Cards 20–28px.
* Soft shadows only.
* Gold is used for primary actions and active states.
* Green is reserved only for success states.
* No Saudi green as main identity color.
* No sharp colors.
* Large spacing.
* Calm premium SaaS look.
* Sidebar right side in Arabic.
* Keep interface easy on the eye.

---

# Current Progress

تم إنجازه:

✅ Authentication

✅ Login

✅ Register

✅ Email Verification

✅ Onboarding

✅ Trial 7 Days

✅ Dashboard

✅ Businesses

✅ Branches

✅ Categories

✅ Products

✅ Tables

✅ QR Menu

✅ Orders

✅ Kitchen

✅ Cashier

✅ Waiter Calls

✅ Bill Requests

✅ Reviews

✅ Statistics

✅ Plans

✅ Subscriptions

✅ Coupons

✅ Admin Dashboard

✅ Sidebar Counters

✅ Product Notes

✅ منع تكرار استدعاء النادل

✅ منع تكرار طلب الفاتورة

✅ إعادة تصميم Login

✅ تنظيف بعض جداول قاعدة البيانات الفارغة

✅ تفعيل Trial كـ Full Features

✅ اعتماد هوية Coffee Premium

🟡 بدأ Feature Engine

🟡 بدأ Dashboard Coffee Theme

---

# Current Database

Database Version:
v1.0

Status:
Refactoring

Last Migration:
2026-06-25

---

## Core Tables

* businesses
* branches
* branch_settings
* branch_staff
* categories
* products
* tables
* table_sessions
* table_activity_logs
* orders
* order_items

---

## Restaurant Tables

* waiter_calls
* bill_requests
* reviews
* product_reviews
* review_reports

---

## Billing Tables

* plans
* subscriptions
* coupons

---

## Identity / Feature Engine Tables

* business_license
* business_features
* business_wallet
* platform_features
* platform_services
* feature_categories

---

## Settings

* platform_settings
* user_onboarding

---

## Old / Pending Review Tables

لا تحذف الآن إلا بعد مراجعة الكود:

* users
* restaurants
* custom_plan_features

---

## Deleted / Cleaned Tables

تم حذف الجداول الفارغة:

* feature_announcement_views
* feature_announcements
* feature_reviews
* feature_trials
* service_subscription_history
* service_subscriptions

---

# Trial System

تم تفعيل Trial كاشتراك كامل.

Trial يعطي Full Features لمدة 7 أيام.

تم تنفيذ SQL لتفعيل:

* menu_qr
* orders
* kitchen
* cashier
* waiter_calls
* bill_requests
* reviews
* stats

داخل business_features.

تم أيضًا تفعيل business_license لمدة 7 أيام.

---

# Current Folder Structure

app/

components/

lib/

public/

docs/

---

# Important Files

app/dashboard/page.tsx

آخر ملف تم تعديله.

تم إرسال نسخة باسم:

dashboard_page_coffee_theme.tsx

المسار الصحيح:

app/dashboard/page.tsx

ملاحظة:

المستخدم لديه ملاحظات على تصميم صفحة الداشبورد الجديدة ويحتاج مراجعتها في المحادثة القادمة.

---

# Current Sprint

Dashboard Coffee Theme Review

الهدف الحالي:

تطبيق هوية Coffee Premium على الداشبورد.

مراجعة الملاحظات على التصميم الجديد.

إصلاح أي مشاكل في layout أو حجم الكروت أو السايد بار.

بعدها:

إكمال صفحة الاشتراك وبناء الباقة.

---

# Live Status

Working Now:

* مراجعة تصميم Dashboard Coffee Theme.
* تثبيت الهوية الجديدة.
* تجهيز v1 للإطلاق.

Completed Today:

* حذف جداول فارغة غير مستخدمة.
* تفعيل Trial Full Features.
* إصلاح عرض Trial داخل Dashboard.
* اعتماد ألوان Coffee Premium.
* إنشاء ملف Dashboard بتصميم Coffee Theme.

Waiting:

* ملاحظات المستخدم على صفحة الداشبورد الجديدة.
* تعديل الملف كامل حسب الملاحظات.
* متابعة صفحة subscription/custom.

Blocked:

لا يوجد.

---

# Important Decisions

✅ ملف واحد فقط للتوثيق:

docs/SAUDIOS_MASTER.md

✅ لا نستخدم ملفات توثيق متعددة الآن.

✅ منيو QR مجاني دائماً.

✅ تجربة مجانية 7 أيام.

✅ كل App له Trial مستقل لاحقًا.

✅ Core + Apps + Services.

✅ لا Marketplace خارجي.

✅ كل التطبيقات من تطوير SaudiOS فقط.

✅ اسم SaudiQR مؤقت.

✅ الهوية الخضراء القديمة ملغية.

✅ الهوية الجديدة Coffee Premium معتمدة.

✅ الهدف الآن إطلاق v1 بأسرع وقت.

✅ ممنوع التوسع إلى ERP / AI / Wallet قبل إطلاق v1.

---

# Current Project State

آخر قرار:

اعتماد Coffee Premium Design System بدل الأخضر.

آخر مهمة:

تطبيق تصميم Coffee Premium على صفحة Dashboard.

آخر ملف:

app/dashboard/page.tsx

آخر ملف تم إرساله:

dashboard_page_coffee_theme.tsx

آخر SQL:

تفعيل business_license و business_features للـ Trial.

آخر فكرة معتمدة:

نركز على إطلاق v1 وليس التوسع.

---

# Next Task

في المحادثة القادمة:

1. المستخدم يرسل ملاحظاته على صفحة الداشبورد الجديدة.
2. يتم تعديل ملف app/dashboard/page.tsx كامل.
3. لا ترسل ترقيعات أو أجزاء كود.
4. أرسل الملف كامل قابل للتحميل.
5. بعد اعتماد الداشبورد نكمل صفحة الاشتراك /subscription/custom.

---

# Code Delivery Rules

مهم جدًا:

المستخدم لا يريد ترقيعات.

لا تقل:

استبدل هذا السطر.

احذف هذا الجزء.

ضع هذا هنا.

القاعدة:

أي ملف يتم تعديله، أرسله كاملًا كملف قابل للتحميل.

---

# Roadmap

Phase 1

QR SaaS v1

🟢 جاري التنفيذ

الهدف:

إطلاق أول نسخة قابلة للبيع خلال أقرب وقت.

---

Phase 2

Subscriptions + Payment

---

Phase 3

POS

---

Phase 4

Inventory

Warehouse

Purchasing

Recipes

---

Phase 5

HR

Payroll

Attendance

---

Phase 6

Accounting

VAT

Financial Reports

---

Phase 7

CRM

Marketing

Loyalty

WhatsApp

---

Phase 8

AI

Forecast

Analytics

Pricing

Assistant

---

Phase 9

Hotels

Retail

Enterprise

---

# Don't Forget

* تغيير الاسم التجاري قبل الإطلاق.
* اختيار دومين وهوية جديدة لاحقاً.
* لا تستخدم Saudi أو KSA أو QR في الاسم النهائي إذا كان يقيّدنا.
* Wallet لاحقًا.
* SaudiQR Apps لاحقًا.
* Proration لاحقًا.
* Notifications لاحقًا.
* ERP لاحقًا.
* AI لاحقًا.
* الأولوية الآن: إطلاق v1.

---

# Changelog

v0.1

* اعتماد SaudiOS Architecture.
* اعتماد Core + Apps + Services.
* بدء Feature Engine.
* بدء إعادة هيكلة قاعدة البيانات.

v0.2

* اعتماد Coffee Premium Design System.
* إلغاء الهوية الخضراء كهوية رئيسية.
* Trial أصبح Full Features.
* حذف جداول فارغة غير مستخدمة.
* تحديث Dashboard إلى Coffee Theme.
* تثبيت قاعدة: ملف توثيق واحد فقط.
* تثبيت قاعدة: أي كود معدل يرسل كملف كامل قابل للتحميل.

---

# Notes

هذا الملف هو المرجع الرسمي الوحيد للمشروع.

أي قرار جديد أو تعديل أو مرحلة جديدة يتم تحديثها هنا مباشرة.

لا يوجد أي ملف آخر يعتمد عليه المشروع.

إذا احتجت معلومة غير موجودة هنا، اطلب إضافتها للملف.

هذا هو التحديث الذي أنصح بإضافته إلى docs/SAUDIOS_MASTER.md:

آخر تحديث

التاريخ:

2026-06-25

الإصدار:

v0.3

الحالة:

🟢 Development

نسبة الإنجاز التقريبية:

47%

Current Sprint

Dashboard Layout Refactor

Completed Today

✅ اعتماد DashboardSidebar كمصدر وحيد للسايد بار.

✅ إزالة السايد بار المكرر من Dashboard.

✅ بدء توحيد جميع صفحات النظام على Sidebar واحد.

✅ تثبيت عرض السايد بار (280px).

✅ بدء توحيد BranchLayout مع Dashboard Layout.

✅ إصلاح جزء من مشاكل Overflow داخل Layout.

✅ اعتماد أن أي تعديل مستقبلي على السايد بار يتم من:

components/DashboardSidebar.tsx

فقط.

Current Status

نعمل حالياً على توحيد الـ Layout بالكامل.

الهدف:

جميع الصفحات تستخدم:

DashboardSidebar
BranchLayout
نفس المقاسات
نفس الهوية
نفس الـ Grid

بدون أي Sidebar مكرر داخل الصفحات.

Remaining Work

ما زال يحتاج مراجعة:

مطابقة Sidebar في Dashboard مع Branch 100%.
نقل Scroll إلى أقصى يمين المتصفح.
إزالة أي Overflow أفقي.
مراجعة Responsive.
مراجعة ارتفاع الكروت.
مراجعة المسافات بين العناصر.
Important Decisions

✅ DashboardSidebar هو المرجع الوحيد للسايد بار.

✅ يمنع إنشاء Sidebar داخل أي صفحة.

✅ أي صفحة تحتاج Sidebar تستدعي:

components/DashboardSidebar.tsx

فقط.

✅ BranchLayout هو المسؤول عن توزيع الصفحة.

✅ Dashboard لا يحتوي أي Sidebar داخلي.

Next Task

عند فتح المحادثة القادمة:

مطابقة Sidebar في جميع الصفحات بنسبة 100%.

تنظيف BranchLayout نهائياً.

إزالة مشاكل Scroll و Overflow.

اعتماد Layout موحد لكل النظام.

بعد الانتهاء من الـ Layout نبدأ صفحة:

/subscription/custom

بنفس هوية Coffee Premium.

Notes

التركيز القادم ليس إضافة مميزات جديدة.

الأولوية الحالية:

تثبيت الـ UI والـ Layout بالكامل حتى تصبح جميع صفحات النظام تستخدم نفس التصميم ونفس المكونات قبل الانتقال لبناء صفحات الاشتراكات وباقي النظام.

وأضيف ملاحظة شخصية بخصوص جلسة اليوم: كان عندي أكثر من مرة افتراضات عن هيكل الملفات بدل الالتزام بالملفات الموجودة عندك، وهذا ضيع وقتك. في الجلسة القادمة سألتزم بالعمل على الملفات الفعلية التي ترسلها فقط، وبأقل قدر ممكن من التغييرات حتى نحافظ على استقرار المشروع.