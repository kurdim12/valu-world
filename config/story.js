// The story: settings, UI copy and Valu's 9 chapters — text from the client deck (Presentation1.pptx, 11 Oct 2026).
// One language at a time: the guest picks English or العربية on the start screen (copy.lang*).
// title / lead / body: shown on the card (no location line: removed 12 Oct, client) · media: picture/video/animation at the top of the card
// moment: the landmark effect (offsets are relative to the point, so it follows the point in Edit mode).
window.VALU_STORY = {
  settings: {
    "autoTour": false,
    "attractAfterSec": 25,
    "cardSec": 14,
    "tourCardSec": 9,
    "bridgePulseEverySec": 18,
    "jordanResetOnTour": true,
    "volume": 0.6,
    "debug": false,
    "cardEdges": [
        "bottom"
    ],
    "fit": "cover",
    "ambientTouch": true
  },
  copy: {
    title:     { en: "The Value Behind Valu", ar: "الڤاليو بڤاليو" }, // AR-REVIEW
    egypt:     { en: "EGYPT", ar: "مصر" }, // AR-REVIEW
    jordan:    { en: "JORDAN", ar: "الأردن" }, // AR-REVIEW
    bridge:    { en: "EGYPT → JORDAN", ar: "مصر ← الأردن" }, // AR-REVIEW
    headline1: { en: "Born in Egypt.", ar: "ولدت في مصر." }, // AR-REVIEW
    headline2: { en: "Growing beyond borders.", ar: "تنمو ما بعد الحدود." }, // AR-REVIEW
    chooseLang: { en: "Choose your language", ar: "اختر لغتك" }, // AR-REVIEW
    langEn:    { en: "English", ar: "English" },
    langAr:    { en: "العربية", ar: "العربية" },
    tapPoints: { en: "Touch the glowing points to discover the story", ar: "المس النقاط المضيئة لتكتشف القصة" } // AR-REVIEW
  },
  chapters: [
    {
      id: 1, side: "egypt", fx: "sketch", year: "",
      title: { en: "Valu 1.0", ar: "ڤاليو 1.0" }, // AR-REVIEW
      media: {"type":"image","src":"assets/media/ch01.jpg"},
      moment: {"type":"sketch","lines":[[[-114,38],[-2,-90],[114,22]],[[-2,-90],[-18,44]],[[-114,38],[-18,44],[114,22]],[[64,-6],[114,-86],[194,-4]],[[190,-2],[226,-38],[266,-2]]]},
      lead: { en: "In 2017, everything started with a sketch and a bold idea.", ar: "بعام 2017، بلّشت الحكاية برسمة وفكرة جريئة." }, // AR-REVIEW
      body: { en: "In 2017, everything started with a sketch and a bold idea: to change the way people interact with money, and make access to finance simpler, smarter and more relevant to everyday life.", ar: "بعام 2017، بلّشت الحكاية برسمة وفكرة جريئة: نغيّر الطريقة اللي الناس بتتعامل فيها مع اموالها، ونخلّي الوصول للحلول المالية أبسط، أذكى، وأقرب لاحتياجاتهم وحياتهم اليومية." } // AR-REVIEW
    },
    {
      id: 2, side: "egypt", fx: "booth", year: "",
      title: { en: "From Idea to Reality", ar: "من فكرة إلى واقع" }, // AR-REVIEW
      media: {"type":"image","src":"assets/media/ch02.jpg"},
      moment: {"type":"booth","base":[0,132]},
      lead: { en: "The sketch became a product, and the product found its first customers.", ar: "الرسمة صارت تطبيق، و وصل لأول عملائه." }, // AR-REVIEW
      body: { en: "Valu launched Egypt’s first Buy Now, Pay Later platform, introducing a new, flexible way to pay. One of its earliest milestones was the launch of the iPhone X at the EFG Holding, where a simple Valu booth marked the start of something much bigger. What began with a handful of transactions quickly proved there was demand for a smarter financial experience.", ar: "أطلقت ڤاليو أول منصة \"للشراء الآن والدفع لاحقاً\" بمصر، وقدّمت طريقة جديدة ومرنة للدفع. وكانت من أولى محطاتها مع إطلاق iPhone X داخل EFG القابضة من نقطة تفعيل بسيطة شكلت بداية لشي أكبر بكثير. ومع أولى المعاملات، صار واضح إن في طلب على تجربة مالية أذكى وأسهل." } // AR-REVIEW
    },
    {
      id: 3, side: "egypt", fx: "network", year: "",
      title: { en: "The Ripple Effect", ar: "شركات تولد آثر" }, // AR-REVIEW
      media: {"type":"categories","dir":"assets/media/icons/","h":300,"icons":["home","business","appliances","travel","sports","education","services","family","gifts","others","jewelry","health","auto","fashion","food","beauty","supermarket","department"]},
      moment: {"type":"nile","bridge":[[-178,-6],[-60,-4],[60,0],[177,8]]},
      lead: { en: "Growth created momentum.", ar: "مع النمو، كبرت شبكة ڤاليو" }, // AR-REVIEW
      body: { en: "As Valu grew, its network grew with it, more merchants, new categories, stronger partnerships, and more ways for customers to use Valu every day. Each new connection strengthened the ecosystem, creating more value for customers and partners alike. Valu wasn’t just expanding its reach. It is building a connected ecosystem.", ar: "توسّعنا مع تجّار أكثر لتشمل قطاعات وفئات جديدة، وبنينا شراكات استراتيجية، وكل إضافة عززت المنظومة وخلقت قيمة أكبر للعملاء والشركاء. من توسيع انتشارنا، لبناء منظومة مترابطة ومتكاملة." } // AR-REVIEW
    },
    {
      id: 4, side: "egypt", fx: "spark", year: "",
      title: { en: "Spark Mode", ar: "سبارك مود" }, // AR-REVIEW
      media: {"type":"spark"},
      moment: {"type":"rise","from":[0,100],"to":[0,-150]},
      lead: { en: "Valu entered a new era.", ar: "دخلت ڤاليو مرحلة جديدة من رحلتها." }, // AR-REVIEW
      body: { en: "With a new headquarters, refreshed identity, growing team, and bigger ambitions, Valu evolved beyond payments and installments into a fintech brand built around people’s everyday financial lives. Spark Mode wasn’t just a rebrand. It marked Valu becoming a bigger, bolder version of itself.", ar: "مع مقر جديد، وهوية متجددة، وفريق وطموحات أكبر، تطورت ڤاليو من مجرد حلول للدفع مرنة لعلامة تكنولوجيا مالية أقرب لحياة الناس المالية اليومية. سبارك مود ما كان مجرد تغيير بالهوية، كان بداية لنسخة أكبر وأجرأ من ڤاليو." } // AR-REVIEW
    },
    {
      id: 5, side: "egypt", fx: "products", year: "",
      title: { en: "Beyond BNPL", ar: "أكثر من مجرد وسيلة للشراء الان والدفع لاحقا" }, // AR-REVIEW
      media: {"type":"logos","dir":"assets/media/logos/","items":[["business",800,108],["flip",531,209],["u",461,264],["akeed",800,128],["invest",800,143],["shazlabaz",800,81],["family",683,185],["mazak",778,126],["ulter",648,186],["aceit",466,213],["azvalu",800,121]]},
      moment: {"type":"lanterns","r":75},
      lead: { en: "BNPL was only the beginning.", ar: "الشراء الآن والدفع لاحقا كان بس البداية." }, // AR-REVIEW
      body: { en: "As customers’ needs grew, Valu evolved from a single payment solution into a wider financial ecosystem spanning financing, payments, savings, investments, cards, and more. From one product to many. From BNPL to an integrated financial ecosystem.", ar: "ومع تطوّر احتياجات العملاء، تطورت ڤاليو من حل واحد لمنظومة مالية متكاملة، بتجمع التمويل، والدفع، والادخار، والاستثمار، والبطاقات وغيرها. من منتج واحد لعدة حلول. ومن الشراء الآن والدفع لاحقا لمنظومة مالية متكاملة." } // AR-REVIEW
    },
    {
      id: 6, side: "egypt", fx: "cafe", year: "",
      title: { en: "Valu Café", ar: "ڤاليو كافيه" }, // AR-REVIEW
      media: {"type":"image","src":"assets/media/ch06.jpg"},
      moment: {"type":"cafe","lights":[[-38,20],[-18,17],[2,13],[22,9],[40,5]]},
      lead: { en: "Then Valu became something customers could experience.", ar: "صارت ڤاليو تجربة بتقدرتعيشها." }, // AR-REVIEW
      body: { en: "Valu Café brought finance into everyday lifestyle, creating a space for coffee, community, connection, and the wider Valu ecosystem. Finance became an experience. Valu became a destination.", ar: "ڤاليو كافيه قرّبت ڤاليو أكتر بحياة الناس اليومية، من خلال مساحة بتجمع القهوة، والتواصل، والتجارب المختلفة، وبتقدّم منظومة ڤاليو بطريقة أقرب للناس. الخدمات المالية صارت تجربة، ڤاليو صارت وجهة." } // AR-REVIEW
    },
    {
      id: 7, side: "egypt", fx: "bell", year: "",
      title: { en: "Valu Going Public", ar: "إدراج ڤاليو في البورصة المصرية" }, // AR-REVIEW
      media: {"type":"image","src":"assets/media/ch07.jpg"},
      moment: {"type":"bell"},
      lead: { en: "Years of growth led to one of Valu’s biggest milestones: Valu went public on EGX.", ar: "سنين من النمو وصلّت ڤاليو لواحدة من أهم محطاتها: إدراج ڤاليو بالبورصة المصرية." }, // AR-REVIEW
      body: { en: "The listing marked how far Valu had come, from an ambitious fintech idea to a company stepping onto the public market. From vision to validation, Valu was ready for its next chapter.", ar: "خطوة الإدراج كانت نقلة كبيرة، من فكرة خدمات مالية طموحة لشركة مدرجة في البورصة المصرية. من رؤية لإنجاز حقيقي، ڤاليو جاهزة للمرحلة الجاي." } // AR-REVIEW
    },
    {
      id: 8, side: "bridge", fx: "bridge", year: "",
      title: { en: "Beyond Borders", ar: "أبعد من الحدود" }, // AR-REVIEW
      media: {"type":"flight"},
      moment: {"type":"bridge"},
      lead: { en: "After building its ecosystem in Egypt, Valu took its first step beyond its home market.", ar: "بعد ما بنت ڤاليو منظومتها بمصر، أخدت أول خطوة إلها خارج سوقها الأساسي." }, // AR-REVIEW
      body: { en: "Jordan marked the beginning of Valu’s regional journey, starting with a soft launch in May 2026 to build its presence, merchant network, introducing customers to the Valu experience.", ar: "الأردن كانت بداية رحلة ڤاليو بالمنطقة، مع الإطلاق التجريبي بشهر مايو 2026، لتبني حضورها، وتوسّع شبكة تجّارها، وتقدّم للعملاء في الأردن تجربة دفع جديدة مع ڤاليو." } // AR-REVIEW
    },
    {
      id: 9, side: "jordan", fx: "jnetwork", year: "",
      title: { en: "Official Launch", ar: "الإطلاق الرسمي" }, // AR-REVIEW
      media: {"type":"image","src":"assets/media/ch09.jpg"},
      moment: {"type":"towers","towers":[[-56,53,144],[12,61,184],[-8,85,120],[64,77,136]]},
      lead: { en: "Taking King Hussein as our HQ, Valu expanded to many locations.", ar: "من شارع الملك حسين، مقرّنا، توسّعت ڤاليو لمواقع كثيرة." }, // AR-REVIEW (NOT FROM THE DECK, written by us)
      body: { en: "Taking King Hussein as our HQ, Valu expanded to many locations from Taj Mall to SV and soon in Khalda, ready to enable new customers and make “⁨اللي مش وقته⁩” ... “⁨هلأ صار وقته⁩”", ar: "من شارع الملك حسين، مقرّنا، توسّعت ڤاليو لمواقع كثيرة من تاج مول لـ SV وقريباً بخلدا، جاهزين نمكّن عملاء جدد ونخلّي \"اللي مش وقته\" ... \"هلأ صار وقته\"" } // AR-REVIEW (NOT FROM THE DECK, written by us)
    }
  ]
};
