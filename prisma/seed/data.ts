/**
 * داده‌های نمونهٔ توسعه — کاملاً ساختگی.
 * نام محصولات، قیمت‌ها، موجودی‌ها و متن‌ها فقط برای نمایش ساختار فروشگاه هستند.
 * هیچ نظر مشتری، آمار فروش یا اطلاعات تماس واقعی در این فایل وجود ندارد.
 */
import type { CollectionType, ColorFamily, DressLength } from "../../src/generated/prisma/enums";

export const COLORS: Array<{ slug: string; name: string; hex: string; family: ColorFamily }> = [
  { slug: "burgundy", name: "زرشکی", hex: "#641E32", family: "RED" },
  { slug: "ruby", name: "یاقوتی", hex: "#A51D3A", family: "RED" },
  { slug: "champagne", name: "شامپاینی", hex: "#D6B56D", family: "GOLD" },
  { slug: "ivory", name: "عاجی", hex: "#F1E6D6", family: "WHITE" },
  { slug: "midnight", name: "سرمه‌ای", hex: "#17243A", family: "BLUE" },
  { slug: "emerald", name: "زمردی", hex: "#176B57", family: "GREEN" },
  { slug: "rose", name: "صورتی پودری", hex: "#E9A0B0", family: "PINK" },
  { slug: "lavender", name: "یاسی", hex: "#B7A1D9", family: "PURPLE" },
  { slug: "terracotta", name: "آجری", hex: "#C76E51", family: "NEUTRAL" },
  { slug: "black", name: "مشکی", hex: "#1D1B1E", family: "BLACK" },
  { slug: "silver", name: "نقره‌ای", hex: "#BCC0C6", family: "SILVER" },
];

export const SIZES = ["36", "38", "40", "42", "44", "46"];

export const SIZE_GUIDE_ROWS = [
  { size: "36", bust: 84, waist: 66, hips: 92, length: 150 },
  { size: "38", bust: 88, waist: 70, hips: 96, length: 151 },
  { size: "40", bust: 92, waist: 74, hips: 100, length: 152 },
  { size: "42", bust: 96, waist: 78, hips: 104, length: 153 },
  { size: "44", bust: 100, waist: 82, hips: 108, length: 154 },
  { size: "46", bust: 106, waist: 88, hips: 114, length: 155 },
];

export const CATEGORIES = [
  { slug: "evening-gowns", name: "لباس شب", description: "لباس‌های بلند شب برای مهمانی‌های رسمی، گالا و شب‌نشینی." },
  { slug: "cocktail-dresses", name: "پیراهن کوکتل", description: "پیراهن‌های کوتاه و میدی برای مهمانی‌های عصرگاهی." },
  { slug: "engagement-dresses", name: "لباس نامزدی و عقد", description: "طرح‌هایی روشن و ظریف برای مراسم نامزدی و عقد." },
  { slug: "formal-jumpsuits", name: "جامپسوت مجلسی", description: "جامپسوت‌های رسمی با برش‌های خوش‌فرم." },
];

export const COLLECTIONS: Array<{
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  type: CollectionType;
  accent: string;
  featured: boolean;
  art: { background: [string, string]; ribbon: [string, string, string] };
}> = [
  {
    slug: "yalda-nights",
    name: "شب‌های یلدا",
    subtitle: "کمپین زمستان",
    description: "رنگ‌های عمیق انار و شب، مخمل و ساتن، برای بلندترین شب سال.",
    type: "CAMPAIGN",
    accent: "ruby",
    featured: true,
    art: { background: ["#2A0C17", "#4A0F22"], ribbon: ["#641E32", "#A51D3A", "#D6B56D"] },
  },
  {
    slug: "autumn-1405",
    name: "پاییز ۱۴۰۵",
    subtitle: "کالکشن فصل",
    description: "رنگ‌های خاکی و آجری با پارچه‌های گرم برای مهمانی‌های پاییزی.",
    type: "SEASON",
    accent: "terracotta",
    featured: true,
    art: { background: ["#3B1E14", "#6B3324"], ribbon: ["#C76E51", "#D6B56D", "#641E32"] },
  },
  {
    slug: "wedding-guest",
    name: "مهمان عروسی",
    subtitle: "مناسبتی",
    description: "انتخاب‌هایی شیک و درخشان برای حضور در جشن عروسی.",
    type: "OCCASION",
    accent: "emerald",
    featured: true,
    art: { background: ["#0C2A23", "#17243A"], ribbon: ["#176B57", "#D6B56D", "#2E8C74"] },
  },
  {
    slug: "engagement-ceremony",
    name: "نامزدی و عقد",
    subtitle: "مناسبتی",
    description: "سایه‌های روشن، صورتی پودری و عاجی برای لحظه‌های آغاز.",
    type: "OCCASION",
    accent: "rose",
    featured: false,
    art: { background: ["#E9D3CF", "#C99AA4"], ribbon: ["#E9A0B0", "#FFF8EF", "#D6B56D"] },
  },
  {
    slug: "gala-evening",
    name: "گالا و شب‌نشینی",
    subtitle: "مناسبتی",
    description: "لباس‌های بلند و باشکوه برای رسمی‌ترین شب‌ها.",
    type: "OCCASION",
    accent: "midnight",
    featured: true,
    art: { background: ["#0E1626", "#17243A"], ribbon: ["#17243A", "#BCC0C6", "#D6B56D"] },
  },
  {
    slug: "graduation",
    name: "جشن فارغ‌التحصیلی",
    subtitle: "مناسبتی",
    description: "طرح‌های جوان و رنگی برای جشن پایان یک فصل.",
    type: "OCCASION",
    accent: "lavender",
    featured: false,
    art: { background: ["#2B2140", "#5B4A80"], ribbon: ["#B7A1D9", "#E9A0B0", "#FFF8EF"] },
  },
  {
    slug: "silk-and-satin",
    name: "ابریشم و ساتن",
    subtitle: "منتخب",
    description: "پارچه‌هایی که نور را می‌رقصانند؛ منتخبی از براق‌ترین طرح‌ها.",
    type: "CURATED",
    accent: "champagne",
    featured: false,
    art: { background: ["#3A2E1E", "#7A6239"], ribbon: ["#D6B56D", "#FFF8EF", "#C76E51"] },
  },
];

export interface SeedPhoto {
  /** نام فایل در prisma/seed/photos */
  file: string;
  color: string;
  angle: "front" | "side" | "back";
}

export interface SeedProduct {
  slug: string;
  name: string;
  subtitle: string;
  category: string;
  collections: string[];
  length: DressLength;
  fabric: string;
  description: string;
  price: number;
  salePrice?: number;
  colors: string[];
  sizes: string[];
  featured?: boolean;
  publishedDaysAgo: number;
  photos: SeedPhoto[];
}

/**
 * محصولات بر پایهٔ عکس‌های واقعی برند (پس‌زمینه حذف و روی استودیوی یکسان قرار گرفته است).
 * نام، قیمت، موجودی و توضیحات نمونه‌اند و باید توسط تیم برند در پنل مدیریت اصلاح شوند.
 */
export const PRODUCTS: SeedProduct[] = [
  {
    slug: "mah-nili-lace-overlay-gown",
    name: "لباس شب ماه‌نیلی",
    subtitle: "کرپ سرمه‌ای با رولباسی توری پولک‌دوزی",
    category: "evening-gowns",
    collections: ["gala-evening", "wedding-guest"],
    length: "FLOOR",
    fabric: "کرپ سنگین سرمه‌ای، رولباسی تور پولک‌دوزی‌شده، یقهٔ سنگ‌دوزی آبشاری",
    description:
      "ماه‌نیلی دو لایه دارد: پیراهنی کشیده از کرپ سرمه‌ای و رولباسی بلند از تور پولک‌دوزی که از کمر به دو سو باز می‌شود. ردیف‌های آبشاری سنگ‌دوزی دور یقه، بی‌نیاز از گردنبند، چهره را قاب می‌گیرد.\n\nآستین بلند توری پوشیده و سبک است و کمربند پارچه‌ای، کمر را تعریف می‌کند.",
    price: 26800000,
    colors: ["midnight"],
    sizes: ["36", "38", "40", "42", "44", "46"],
    featured: true,
    publishedDaysAgo: 5,
    photos: [{ file: "mah-nili-midnight-front.webp", color: "midnight", angle: "front" }],
  },
  {
    slug: "shabtab-one-shoulder-gown",
    name: "لباس شب شب‌تاب",
    subtitle: "یک‌شانهٔ مشکی با دامن ارگانزای ژاکارد",
    category: "evening-gowns",
    collections: ["yalda-nights", "gala-evening"],
    length: "FLOOR",
    fabric: "کرپ مشکی، ارگانزای ژاکارد گل‌برجسته سرمه‌ای و فیروزه‌ای، سنگ‌دوزی دستی سرشانه",
    description:
      "شب‌تاب بالاتنه‌ای یک‌شانه و کشیده از کرپ مشکی دارد که با پاپیون حجیم سرمه‌ای و آویزهای سنگ‌دوزی‌شده روی سرشانه تمام می‌شود. دامن دوم از ارگانزای ژاکارد با گل‌های برجستهٔ سرمه‌ای از پهلو آغاز و به دنباله‌ای باشکوه ختم می‌شود.",
    price: 38900000,
    colors: ["black"],
    sizes: ["36", "38", "40", "42", "44"],
    featured: true,
    publishedDaysAgo: 2,
    photos: [
      { file: "shabtab-black-front.webp", color: "black", angle: "front" },
      { file: "shabtab-black-side.webp", color: "black", angle: "side" },
    ],
  },
  {
    slug: "setareh-baran-beaded-gown",
    name: "لباس شب ستاره‌باران",
    subtitle: "ماهی سرمه‌ای با سنگ‌دوزی هندسی کامل",
    category: "evening-gowns",
    collections: ["gala-evening", "yalda-nights"],
    length: "FLOOR",
    fabric: "تور سرمه‌ای با سنگ‌دوزی و پولک‌دوزی کامل، آستر کشی",
    description:
      "ستاره‌باران سراسر با نقش‌های هندسی از سنگ و پولک نقره‌ای دوخته شده است. برش ماهی و یقهٔ هفت، قامت را کشیده نشان می‌دهد و نقش‌های جناغی رو به پایین، نگاه را تا دنبالهٔ کوتاه دامن همراهی می‌کنند.",
    price: 33500000,
    salePrice: 29900000,
    colors: ["midnight"],
    sizes: ["36", "38", "40", "42"],
    featured: true,
    publishedDaysAgo: 12,
    photos: [{ file: "setareh-baran-midnight-front.webp", color: "midnight", angle: "front" }],
  },
  {
    slug: "afsoon-strapless-ballgown",
    name: "لباس شب افسون",
    subtitle: "دکلتهٔ پرنسسی ساتن با گل پر",
    category: "evening-gowns",
    collections: ["wedding-guest", "silk-and-satin", "yalda-nights"],
    length: "FLOOR",
    fabric: "ساتن براق سنگین، گل تزئینی از پر و سنگ‌دوزی",
    description:
      "افسون دامنی پرحجم از ساتن مشکی دارد که پنلی رنگی از ساتن، از بالاتنهٔ چین‌دار تا پایین دامن را مثل آبشار طی می‌کند. گلی از پر و سنگ‌دوزی روی کمر، نقطهٔ تمرکز این طرح است. در دو ترکیب شامپاینی‌مشکی و زرشکی‌مشکی دوخته می‌شود.",
    price: 31200000,
    colors: ["champagne", "ruby"],
    sizes: ["36", "38", "40", "42", "44"],
    featured: true,
    publishedDaysAgo: 8,
    photos: [
      { file: "afsoon-champagne-front.webp", color: "champagne", angle: "front" },
      { file: "afsoon-ruby-front.webp", color: "ruby", angle: "front" },
    ],
  },
  {
    slug: "golbarg-jacquard-gown",
    name: "لباس شب گلبرگ",
    subtitle: "ژاکارد براق با گلبرگ‌های سه‌بعدی",
    category: "evening-gowns",
    collections: ["autumn-1405", "silk-and-satin", "wedding-guest"],
    length: "FLOOR",
    fabric: "ژاکارد ساتن با نقش گل، یقهٔ تور ظریف، سگک سنگ‌دوزی",
    description:
      "گلبرگ با گلبرگ‌های بزرگ پارچه‌ای که از سرشانه تا کمر روی هم نشسته‌اند شناخته می‌شود؛ سگکی سنگ‌دوزی‌شده مرکز این گل را می‌سازد. یقهٔ تور، دامن کلوش ژاکارد و برش‌های ظریف کمر، ترکیبی رسمی و امروزی ساخته‌اند. در پشت لباس نیز گلبرگ‌ها با خطوط سنگ‌دوزی تکرار شده‌اند.",
    price: 27400000,
    colors: ["burgundy", "midnight", "black"],
    sizes: ["36", "38", "40", "42", "44", "46"],
    featured: true,
    publishedDaysAgo: 3,
    photos: [
      { file: "golbarg-burgundy-front.webp", color: "burgundy", angle: "front" },
      { file: "golbarg-midnight-front.webp", color: "midnight", angle: "front" },
      { file: "golbarg-black-back.webp", color: "black", angle: "back" },
    ],
  },
];

/** محصولات تصویرسازی‌شدهٔ نسخهٔ قبلی seed که اکنون بایگانی می‌شوند */
export const LEGACY_PLACEHOLDER_SLUGS = [
  "mahrokh-velvet-mermaid-gown",
  "niloufar-satin-ballgown",
  "anahita-column-gown",
  "termeh-sequin-gown",
  "shabbu-aline-gown",
  "morvarid-engagement-dress",
  "golnaz-engagement-cape-gown",
  "setareh-cocktail-dress",
  "yas-satin-midi-dress",
  "rana-mini-dress",
  "shahrzad-velvet-midi",
  "parnian-silk-gown",
  "arghavan-cape-gown",
  "aida-mermaid-satin",
  "simin-formal-jumpsuit",
  "taraneh-satin-jumpsuit",
  "delaram-knee-dress",
  "roya-draft-gown",
];

export const SHIPPING_METHODS = [
  { code: "post-pishtaz", name: "پست پیشتاز", description: "ارسال به سراسر کشور", price: 120000, minDays: 2, maxDays: 5, sortOrder: 1 },
  { code: "courier-isfahan", name: "پیک ویژهٔ اصفهان", description: "تحویل در اصفهان طی یک روز کاری", price: 250000, minDays: 1, maxDays: 1, sortOrder: 2 },
];

export const PAGES = [
  {
    slug: "our-story",
    title: "داستان روشاک",
    summary: "روشاک از دل علاقه به دوخت دقیق و پارچه‌های خوش‌دست آمده است؛ لباس‌هایی برای شب‌هایی که می‌خواهید به یاد بمانند.",
    body: `## لباسی برای شب‌هایی که به یاد می‌مانند

روشاک برای شب‌هایی ساخته شده که می‌خواهید بدرخشید. در هر طرح همین را دنبال می‌کنیم: لباسی که زیر نور شب بدرخشد و در خاطره بماند.

## دوخت آهسته، جزئیات دقیق

هر طرح ابتدا روی مانکن خیاطی شکل می‌گیرد، چندین بار آزمایش می‌شود و تنها پس از اطمینان از افتادگی پارچه و راحتی برش، به تولید می‌رسد.

## پارچه‌هایی که با دقت انتخاب می‌شوند

مخمل، ساتن، کرپ و ابریشم را بر اساس وزن، افتادگی و دوام انتخاب می‌کنیم تا لباس در طول مهمانی همان‌قدر خوش‌فرم بماند که در لحظهٔ پوشیدن بود.

> این متن نمونه است و باید توسط تیم برند با داستان واقعی روشاک جایگزین شود.`,
  },
  {
    slug: "shipping",
    title: "شرایط ارسال",
    summary: "روش‌ها، زمان و هزینهٔ ارسال سفارش‌ها.",
    body: `## روش‌های ارسال

- **پست پیشتاز:** ارسال به سراسر کشور، معمولاً ۲ تا ۵ روز کاری.
- **پیک ویژهٔ اصفهان:** تحویل در اصفهان طی یک روز کاری.

## ارسال رایگان

برای سفارش‌هایی که مبلغ آن‌ها پس از کسر تخفیف از سقف تعیین‌شده در تنظیمات فروشگاه بیشتر باشد، هزینهٔ ارسال رایگان است.

## زمان آماده‌سازی

سفارش‌ها پس از تأیید پرداخت، حداکثر طی ۲ روز کاری آماده و تحویل شرکت حمل می‌شوند. کد رهگیری از طریق ایمیل و صفحهٔ پیگیری سفارش در دسترس شما قرار می‌گیرد.

> این متن نمونه است و باید با سیاست واقعی فروشگاه بازبینی شود.`,
  },
  {
    slug: "returns",
    title: "بازگشت و تعویض کالا",
    summary: "شرایط مرجوع کردن و تعویض سفارش.",
    body: `## مهلت بازگشت

تا ۷ روز پس از تحویل، در صورت سالم بودن کالا، داشتن برچسب و استفاده نشدن، می‌توانید درخواست بازگشت یا تعویض سایز ثبت کنید.

## موارد غیرقابل بازگشت

لباس‌هایی که بر اساس اندازهٔ اختصاصی دوخته شده‌اند یا برچسب آن‌ها جدا شده است، قابل بازگشت نیستند.

## بازپرداخت

پس از دریافت و بررسی کالا، مبلغ طی ۷۲ ساعت کاری به حساب شما بازگردانده می‌شود.

> این متن نمونه است و باید با سیاست واقعی فروشگاه و قوانین تجارت الکترونیک بازبینی شود.`,
  },
  {
    slug: "privacy",
    title: "حریم خصوصی",
    summary: "چگونه از اطلاعات شما محافظت می‌کنیم.",
    body: `## اطلاعاتی که جمع‌آوری می‌کنیم

نام، ایمیل، شمارهٔ تماس و نشانی برای پردازش و ارسال سفارش ذخیره می‌شود. اطلاعات کارت بانکی هرگز در سایت روشاک ذخیره نمی‌شود و پرداخت مستقیماً در درگاه بانکی انجام می‌شود.

## استفاده از اطلاعات

اطلاعات شما فقط برای پردازش سفارش، پشتیبانی و (در صورت رضایت شما) ارسال خبرنامه استفاده می‌شود و به اشخاص ثالث فروخته نمی‌شود.

## کوکی‌ها

کوکی‌های ضروری برای ورود به حساب و نگهداری سبد خرید استفاده می‌شوند. کوکی‌های تحلیلی فقط با رضایت شما فعال می‌شوند.

> این متن نمونه است و پیش از انتشار باید توسط مشاور حقوقی بازبینی شود.`,
  },
  {
    slug: "terms",
    title: "قوانین و شرایط خرید",
    summary: "شرایط استفاده از فروشگاه اینترنتی روشاک.",
    body: `## ثبت سفارش

ثبت سفارش به معنای پذیرش شرایط خرید است. قیمت‌ها و موجودی در لحظهٔ پرداخت نهایی می‌شوند.

## مهلت پرداخت

کالاهای سفارش تا پایان مهلت پرداخت برای شما رزرو می‌شوند؛ پس از آن سفارش پرداخت‌نشده لغو و کالا به انبار بازمی‌گردد.

## مالکیت معنوی

طرح‌ها، تصاویر و محتوای این سایت متعلق به روشاک است.

> این متن نمونه است و پیش از انتشار باید توسط مشاور حقوقی بازبینی شود.`,
  },
];

export const FAQ = [
  { group: "سفارش و ارسال", question: "سفارش من چه زمانی ارسال می‌شود؟", answer: "سفارش‌ها پس از تأیید پرداخت، حداکثر طی ۲ روز کاری آماده و ارسال می‌شوند." },
  { group: "سفارش و ارسال", question: "چطور سفارشم را پیگیری کنم؟", answer: "از بخش «سفارش‌های من» در حساب کاربری یا صفحهٔ «پیگیری سفارش» با شمارهٔ سفارش و ایمیل خود اقدام کنید." },
  { group: "سایز و اندازه", question: "چطور سایز مناسب را انتخاب کنم؟", answer: "در صفحهٔ هر محصول، «راهنمای سایز» را باز کنید و اندازهٔ دور سینه، کمر و باسن خود را با جدول مقایسه کنید." },
  { group: "سایز و اندازه", question: "اگر سایز مناسب نبود، امکان تعویض وجود دارد؟", answer: "بله، تا ۷ روز پس از تحویل و در صورت سالم بودن کالا و داشتن برچسب، امکان تعویض سایز وجود دارد." },
  { group: "پرداخت", question: "چه روش‌های پرداختی دارید؟", answer: "پرداخت از طریق درگاه بانکی امن انجام می‌شود. اطلاعات کارت شما در سایت روشاک ذخیره نمی‌شود." },
  { group: "نگهداری", question: "لباس‌های مخمل و ساتن را چطور نگهداری کنم؟", answer: "این پارچه‌ها را فقط به خشکشویی بسپارید، روی چوب‌لباسی پهن آویزان کنید و از تابش مستقیم آفتاب دور نگه دارید." },
];

export const ARTICLES = [
  {
    slug: "choosing-an-evening-gown",
    title: "راهنمای انتخاب لباس شب متناسب با فرم بدن",
    excerpt: "برش ماهی، کلوش یا مستقیم؟ چند اصل ساده برای انتخاب لباسی که بهترین نسخهٔ شما را نشان دهد.",
    author: "تحریریهٔ روشاک",
    minutes: 5,
    art: { background: ["#2A0C17", "#641E32"] as [string, string], ribbon: ["#A51D3A", "#D6B56D", "#E9A0B0"] as [string, string, string] },
    body: `انتخاب لباس شب بیش از هر چیز به شناخت تناسب بدن برمی‌گردد. چند اصل ساده کمک می‌کند انتخاب مطمئن‌تری داشته باشید.

## برش ماهی

برش ماهی فرم بدن را تا زانو دنبال می‌کند و سپس باز می‌شود. برای کسانی که می‌خواهند منحنی‌های بدن دیده شود انتخاب درخشانی است.

## برش کلوش (A)

از کمر به آرامی باز می‌شود و تقریباً به همهٔ فرم‌های بدن می‌آید. اگر میان دو انتخاب مردد هستید، کلوش انتخاب امن و شیکی است.

## برش مستقیم

برش مستقیم و مینیمال، قامت را بلندتر نشان می‌دهد. با یک چاک بلند، حرکت راحت‌تر و جلوه‌ای مدرن‌تر خواهید داشت.

## یقه را فراموش نکنید

یقهٔ هفت گردن را کشیده‌تر نشان می‌دهد، یقهٔ قلبی بالاتنه را متعادل می‌کند و یقهٔ روی‌شانه برای شانه‌های ظریف جلوه‌ای رمانتیک دارد.`,
  },
  {
    slug: "winter-color-pairings",
    title: "ترکیب رنگ‌ها در مهمانی‌های زمستانی",
    excerpt: "زرشکی، زمردی و سرمه‌ای؛ رنگ‌های عمیق زمستان را چطور با زیورآلات و کفش هماهنگ کنیم.",
    author: "تحریریهٔ روشاک",
    minutes: 4,
    art: { background: ["#0C2A23", "#17243A"] as [string, string], ribbon: ["#176B57", "#D6B56D", "#17243A"] as [string, string, string] },
    body: `زمستان فصل رنگ‌های عمیق است. این رنگ‌ها در نور گرم مهمانی‌ها جلوهٔ بیشتری دارند.

## زرشکی و طلایی

زرشکی با زیورآلات طلایی و کفش شامپاینی، ترکیبی کلاسیک و گرم می‌سازد.

## زمردی و نقره‌ای

سبز زمردی کنار نقره‌ای و کریستال، حسی سرد و درخشان دارد؛ مناسب مهمانی‌های رسمی.

## سرمه‌ای، جایگزین مشکی

اگر از مشکی خسته شده‌اید، سرمه‌ای همان وقار را با کمی گرمای بیشتر دارد و با تقریباً هر فلزی هماهنگ می‌شود.`,
  },
  {
    slug: "caring-for-velvet-and-satin",
    title: "مراقبت از لباس‌های مخمل و ساتن",
    excerpt: "چند نکتهٔ کاربردی برای اینکه لباس مجلسی شما سال‌ها مثل روز اول بماند.",
    author: "تحریریهٔ روشاک",
    minutes: 3,
    art: { background: ["#3A2E1E", "#7A6239"] as [string, string], ribbon: ["#D6B56D", "#FFF8EF", "#641E32"] as [string, string, string] },
    body: `لباس‌های مجلسی از پارچه‌های حساس دوخته می‌شوند و نگهداری درست عمرشان را چند برابر می‌کند.

## مخمل

مخمل را تا نکنید؛ روی چوب‌لباسی پهن آویزان کنید و برای صاف کردن پرزها از بخار ملایم استفاده کنید، نه اتوی مستقیم.

## ساتن و ابریشم

ساتن به لک آب حساس است. لک را فوراً با دستمال خشک بگیرید و برای تمیزکاری فقط از خشکشویی استفاده کنید.

## نگهداری بلندمدت

لباس را در کاور پارچه‌ای (نه پلاستیکی) و دور از نور مستقیم نگه دارید تا رنگ و بافت آن حفظ شود.`,
  },
];
