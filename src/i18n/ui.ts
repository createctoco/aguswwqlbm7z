import { BUILD_LOCALE } from './config';

const english = {
  collections: 'Collections',
  category: 'Category',
  viewMore: 'More',
  wholesaleCatalog: 'Wholesale catalog',
  productsHeading: 'Catholic gifts and religious accessories for wholesale buyers.',
  productsIntro:
    'Explore verified product details, materials, variants, and devotional context. Wholesale unit prices are listed for every product. Contact us for quantity discounts and sourcing details.',
  productCollectionsAria: 'Product collections',
  showingProducts: 'Showing {shown} of {total} synchronized products',
  previous: 'Previous',
  next: 'Next',
  pageOf: 'Page {page} of {pages}',
  browseBySeries: 'Browse by series',
  collectionsHeading: 'Catholic gift collections',
  collectionsIntro:
    'Collections are synchronized from our product catalog, so new product categories appear here automatically.',
  product: 'product',
  products: 'products',
  productSeries: 'Product series',
  synchronizedInCollection: '{count} synchronized {items} in this collection.',
  perUnit: '/ unit',
  viewProduct: 'View {title}',
  productsMetaTitle: 'Wholesale Catholic Gifts & Religious Accessories',
  productsMetaDescription:
    'Browse OUOOO wholesale Catholic gifts, devotional jewelry, religious ornaments, and accessories sourced for international buyers.',
  collectionsMetaTitle: 'Catholic Gift Collections',
  collectionsMetaDescription:
    'Browse OUOOO wholesale Catholic gifts and religious accessories by synchronized product collection.',
  collectionMetaTitle: '{name} | Wholesale Catholic Gifts',
  collectionMetaDescription:
    'Browse {name} from the OUOOO wholesale Catholic gifts catalog and request sourcing information.',
};

const localized: Partial<Record<string, Partial<Record<keyof typeof english, string>>>> = {
  it: {
    collections: 'Collezioni',
    category: 'Categoria',
    viewMore: 'Altro',
    wholesaleCatalog: 'Catalogo all\u2019ingrosso',
    productsHeading: 'Regali cattolici e accessori religiosi per acquirenti all\u2019ingrosso.',
    productsIntro:
      'Esplora dettagli prodotto verificati, materiali, varianti e contesto devozionale. I prezzi unitari all\u2019ingrosso sono indicati per ogni prodotto. Contattaci per sconti sulla quantit\u00e0 e dettagli di approvvigionamento.',
    productCollectionsAria: 'Collezioni di prodotti',
    showingProducts: 'Mostrando {shown} di {total} prodotti sincronizzati',
    previous: 'Precedente',
    next: 'Successivo',
    pageOf: 'Pagina {page} di {pages}',
    browseBySeries: 'Sfoglia per serie',
    collectionsHeading: 'Collezioni di regali cattolici',
    collectionsIntro:
      'Le collezioni sono sincronizzate dal nostro catalogo prodotti, quindi le nuove categorie compaiono qui automaticamente.',
    product: 'prodotto',
    products: 'prodotti',
    productSeries: 'Serie di prodotti',
    synchronizedInCollection: '{count} {items} sincronizzati in questa collezione.',
    perUnit: '/ unit\u00e0',
    viewProduct: 'Vedi {title}',
    productsMetaTitle: 'Regali cattolici all\u2019ingrosso e accessori religiosi',
    productsMetaDescription:
      'Scopri regali cattolici, gioielli devozionali, ornamenti religiosi e accessori all\u2019ingrosso OUOOO, selezionati per acquirenti internazionali.',
    collectionsMetaTitle: 'Collezioni di regali cattolici',
    collectionsMetaDescription:
      'Esplora regali cattolici e accessori religiosi all\u2019ingrosso OUOOO per collezione di prodotti sincronizzata.',
    collectionMetaTitle: '{name} | Regali cattolici all\u2019ingrosso',
    collectionMetaDescription:
      'Scopri {name} dal catalogo di regali cattolici all\u2019ingrosso OUOOO e richiedi informazioni di approvvigionamento.',
  },
  es: {
    collections: 'Colecciones',
    category: 'Categoría',
    viewMore: 'Más',
    wholesaleCatalog: 'Cat\u00e1logo al por mayor',
    productsHeading: 'Regalos cat\u00f3licos y accesorios religiosos para compradores al por mayor.',
    productsIntro:
      'Explore detalles de producto verificados, materiales, variantes y contexto devocional. Se listan precios unitarios al por mayor para cada producto. Cont\u00e1ctenos para descuentos por volumen y detalles de abastecimiento.',
    productCollectionsAria: 'Colecciones de productos',
    showingProducts: 'Mostrando {shown} de {total} productos sincronizados',
    previous: 'Anterior',
    next: 'Siguiente',
    pageOf: 'P\u00e1gina {page} de {pages}',
    browseBySeries: 'Explorar por series',
    collectionsHeading: 'Colecciones de regalos cat\u00f3licos',
    collectionsIntro:
      'Las colecciones se sincronizan desde nuestro cat\u00e1logo de productos, por lo que las nuevas categor\u00edas aparecen aqu\u00ed autom\u00e1ticamente.',
    product: 'producto',
    products: 'productos',
    productSeries: 'Serie de productos',
    synchronizedInCollection: '{count} {items} sincronizados en esta colecci\u00f3n.',
    perUnit: '/ unidad',
    viewProduct: 'Ver {title}',
    productsMetaTitle: 'Regalos cat\u00f3licos al por mayor y accesorios religiosos',
    productsMetaDescription:
      'Descubra regalos cat\u00f3licos al por mayor, joyer\u00eda devocional, ornamentos religiosos y accesorios OUOOO para compradores internacionales.',
    collectionsMetaTitle: 'Colecciones de regalos cat\u00f3licos',
    collectionsMetaDescription:
      'Explore regalos cat\u00f3licos y accesorios religiosos al por mayor OUOOO por colecci\u00f3n de productos sincronizada.',
    collectionMetaTitle: '{name} | Regalos cat\u00f3licos al por mayor',
    collectionMetaDescription:
      'Descubra {name} en el cat\u00e1logo de regalos cat\u00f3licos al por mayor OUOOO y solicite informaci\u00f3n de abastecimiento.',
  },
  fr: {
    collections: 'Collections',
    category: 'Catégorie',
    viewMore: 'Plus',
    wholesaleCatalog: 'Catalogue de gros',
    productsHeading: 'Cadeaux catholiques et accessoires religieux pour les acheteurs en gros.',
    productsIntro:
      'Explorez des fiches produits v\u00e9rifi\u00e9es, les mat\u00e9riaux, les variantes et le contexte d\u00e9votionnel. Les prix unitaires en gros sont indiqu\u00e9s pour chaque produit. Contactez-nous pour des remises sur volume et les d\u00e9tails d\u2019approvisionnement.',
    productCollectionsAria: 'Collections de produits',
    showingProducts: 'Affichage de {shown} sur {total} produits synchronis\u00e9s',
    previous: 'Pr\u00e9c\u00e9dent',
    next: 'Suivant',
    pageOf: 'Page {page} sur {pages}',
    browseBySeries: 'Parcourir par s\u00e9ries',
    collectionsHeading: 'Collections de cadeaux catholiques',
    collectionsIntro:
      'Les collections sont synchronis\u00e9es depuis notre catalogue de produits ; les nouvelles cat\u00e9gories apparaissent donc automatiquement ici.',
    product: 'produit',
    products: 'produits',
    productSeries: 'S\u00e9rie de produits',
    synchronizedInCollection: '{count} {items} synchronis\u00e9s dans cette collection.',
    perUnit: '/ unit\u00e9',
    viewProduct: 'Voir {title}',
    productsMetaTitle: 'Cadeaux catholiques en gros et accessoires religieux',
    productsMetaDescription:
      'D\u00e9couvrez des cadeaux catholiques en gros, bijoux d\u00e9votionnels, ornements religieux et accessoires OUOOO pour les acheteurs internationaux.',
    collectionsMetaTitle: 'Collections de cadeaux catholiques',
    collectionsMetaDescription:
      'Explorez les cadeaux catholiques et accessoires religieux en gros OUOOO par collection de produits synchronis\u00e9e.',
    collectionMetaTitle: '{name} | Cadeaux catholiques en gros',
    collectionMetaDescription:
      'D\u00e9couvrez {name} dans le catalogue de cadeaux catholiques en gros OUOOO et demandez des informations d\u2019approvisionnement.',
  },
  pt: {
    collections: 'Cole\u00e7\u00f5es',
    category: 'Categoria',
    viewMore: 'Mais',
    wholesaleCatalog: 'Cat\u00e1logo de atacado',
    productsHeading: 'Presentes cat\u00f3licos e acess\u00f3rios religiosos para compradores de atacado.',
    productsIntro:
      'Explore detalhes de produtos verificados, materiais, varia\u00e7\u00f5es e contexto devocional. Os pre\u00e7os unit\u00e1rios de atacado s\u00e3o listados para cada produto. Fale conosco para descontos por volume e detalhes de fornecimento.',
    productCollectionsAria: 'Cole\u00e7\u00f5es de produtos',
    showingProducts: 'Mostrando {shown} de {total} produtos sincronizados',
    previous: 'Anterior',
    next: 'Pr\u00f3ximo',
    pageOf: 'P\u00e1gina {page} de {pages}',
    browseBySeries: 'Explorar por s\u00e9ries',
    collectionsHeading: 'Cole\u00e7\u00f5es de presentes cat\u00f3licos',
    collectionsIntro:
      'As cole\u00e7\u00f5es s\u00e3o sincronizadas do nosso cat\u00e1logo de produtos, ent\u00e3o novas categorias aparecem aqui automaticamente.',
    product: 'produto',
    products: 'produtos',
    productSeries: 'S\u00e9rie de produtos',
    synchronizedInCollection: '{count} {items} sincronizados nesta cole\u00e7\u00e3o.',
    perUnit: '/ unidade',
    viewProduct: 'Ver {title}',
    productsMetaTitle: 'Presentes cat\u00f3licos de atacado e acess\u00f3rios religiosos',
    productsMetaDescription:
      'Conhe\u00e7a presentes cat\u00f3licos de atacado, joias devocionais, ornamentos religiosos e acess\u00f3rios OUOOO para compradores internacionais.',
    collectionsMetaTitle: 'Cole\u00e7\u00f5es de presentes cat\u00f3licos',
    collectionsMetaDescription:
      'Explore presentes cat\u00f3licos e acess\u00f3rios religiosos de atacado OUOOO por cole\u00e7\u00e3o de produtos sincronizada.',
    collectionMetaTitle: '{name} | Presentes cat\u00f3licos de atacado',
    collectionMetaDescription:
      'Conhe\u00e7a {name} no cat\u00e1logo de presentes cat\u00f3licos de atacado OUOOO e solicite informa\u00e7\u00f5es de fornecimento.',
  },
  pl: {
    collections: 'Kolekcje',
    category: 'Kategoria',
    viewMore: 'Więcej',
    wholesaleCatalog: 'Katalog hurtowy',
    productsHeading: 'Prezenty katolickie i akcesoria religijne dla kupuj\u0105cych hurtowych.',
    productsIntro:
      'Przegl\u0105daj zweryfikowane szczeg\u00f3\u0142y produkt\u00f3w, materia\u0142y, warianty i kontekst dewocyjny. Dla ka\u017cdego produktu podana jest cena jednostkowa hurtowa. Skontaktuj si\u0119 z nami w sprawie rabat\u00f3w ilo\u015bciowych i szczeg\u00f3\u0142\u00f3w zaopatrzenia.',
    productCollectionsAria: 'Kolekcje produkt\u00f3w',
    showingProducts: 'Wy\u015bwietlanie {shown} z {total} zsynchronizowanych produkt\u00f3w',
    previous: 'Poprzednia',
    next: 'Nast\u0119pna',
    pageOf: 'Strona {page} z {pages}',
    browseBySeries: 'Przegl\u0105daj wed\u0142ug serii',
    collectionsHeading: 'Kolekcje prezent\u00f3w katolickich',
    collectionsIntro:
      'Kolekcje s\u0105 synchronizowane z naszego katalogu produkt\u00f3w, wi\u0119c nowe kategorie pojawiaj\u0105 si\u0119 tutaj automatycznie.',
    product: 'produkt',
    products: 'produkty',
    productSeries: 'Seria produkt\u00f3w',
    synchronizedInCollection: '{count} zsynchronizowanych {items} w tej kolekcji.',
    perUnit: '/ szt.',
    viewProduct: 'Zobacz {title}',
    productsMetaTitle: 'Prezenty katolickie hurtowo i akcesoria religijne',
    productsMetaDescription:
      'Poznaj hurtowe prezenty katolickie, bi\u017cuteri\u0119 dewocyjn\u0105, ozdoby religijne i akcesoria OUOOO dla mi\u0119dzynarodowych kupc\u00f3w.',
    collectionsMetaTitle: 'Kolekcje prezent\u00f3w katolickich',
    collectionsMetaDescription:
      'Przegl\u0105daj hurtowe prezenty katolickie i akcesoria religijne OUOOO wed\u0142ug zsynchronizowanych kolekcji produkt\u00f3w.',
    collectionMetaTitle: '{name} | Prezenty katolickie hurtowo',
    collectionMetaDescription:
      'Poznaj {name} w katalogu hurtowych prezent\u00f3w katolickich OUOOO i popro\u015b o informacje dotycz\u0105ce zaopatrzenia.',
  },
  de: {
    collections: 'Kollektionen',
    category: 'Kategorie',
    viewMore: 'Mehr',
    wholesaleCatalog: 'Gro\u00dfhandelskatalog',
    productsHeading: 'Katholische Geschenke und religi\u00f6se Accessoires f\u00fcr Gro\u00dfhandelsk\u00e4ufer.',
    productsIntro:
      'Entdecken Sie verifizierte Produktdetails, Materialien, Varianten und den religi\u00f6sen Kontext. F\u00fcr jedes Produkt ist ein Gro\u00dfhandels-Einzelpreis angegeben. Kontaktieren Sie uns f\u00fcr Mengenrabatte und Beschaffungsdetails.',
    productCollectionsAria: 'Produktkollektionen',
    showingProducts: 'Zeige {shown} von {total} synchronisierten Produkten',
    previous: 'Zur\u00fcck',
    next: 'Weiter',
    pageOf: 'Seite {page} von {pages}',
    browseBySeries: 'Nach Serien st\u00f6bern',
    collectionsHeading: 'Katholische Geschenk-Kollektionen',
    collectionsIntro:
      'Die Kollektionen werden aus unserem Produktkatalog synchronisiert, sodass neue Kategorien hier automatisch erscheinen.',
    product: 'Produkt',
    products: 'Produkte',
    productSeries: 'Produktserie',
    synchronizedInCollection: '{count} synchronisierte {items} in dieser Kollektion.',
    perUnit: '/ St\u00fcck',
    viewProduct: 'Ansehen: {title}',
    productsMetaTitle: 'Katholische Geschenke im Gro\u00dfhandel und religi\u00f6se Accessoires',
    productsMetaDescription:
      'Entdecken Sie katholische Geschenke, Devotionalien, religi\u00f6se Ornamente und Accessoires im Gro\u00dfhandel von OUOOO f\u00fcr internationale K\u00e4ufer.',
    collectionsMetaTitle: 'Katholische Geschenk-Kollektionen',
    collectionsMetaDescription:
      'Entdecken Sie katholische Geschenke und religi\u00f6se Accessoires im Gro\u00dfhandel von OUOOO nach synchronisierten Produktkollektionen.',
    collectionMetaTitle: '{name} | Katholische Geschenke im Gro\u00dfhandel',
    collectionMetaDescription:
      'Entdecken Sie {name} im Gro\u00dfhandelskatalog f\u00fcr katholische Geschenke von OUOOO und fordern Sie Beschaffungsinformationen an.',
  },
  fil: {
    collections: 'Mga Koleksyon',
    category: 'Kategorya',
    viewMore: 'Higit pa',
    wholesaleCatalog: 'Katalogo ng pakyawan',
    productsHeading: 'Mga regalong Katoliko at relihiyosong aksesorya para sa mga bumibili nang pakyawan.',
    productsIntro:
      'Tingnan ang mga na-verify na detalye ng produkto, materyales, variant, at kontekstong debosyonal. Nakalagay ang presyo ng bawat produkto para sa pakyawan. Makipag-ugnayan sa amin para sa diskwento sa dami at mga detalye ng pagkuha.',
    productCollectionsAria: 'Mga koleksyon ng produkto',
    showingProducts: 'Ipinapakita ang {shown} sa {total} na naka-sync na produkto',
    previous: 'Nakaraan',
    next: 'Susunod',
    pageOf: 'Pahina {page} ng {pages}',
    browseBySeries: 'Mag-browse ayon sa serye',
    collectionsHeading: 'Mga koleksyon ng regalong Katoliko',
    collectionsIntro:
      'Naka-sync ang mga koleksyon mula sa aming katalogo ng produkto, kaya awtomatikong lalabas dito ang mga bagong kategorya.',
    product: 'produkto',
    products: 'mga produkto',
    productSeries: 'Serye ng produkto',
    synchronizedInCollection: '{count} naka-sync na {items} sa koleksyong ito.',
    perUnit: '/ bawat piraso',
    viewProduct: 'Tingnan ang {title}',
    productsMetaTitle: 'Mga regalong Katoliko nang pakyawan at mga aksesoryang panrelihiyon',
    productsMetaDescription:
      'Tingnan ang mga regalong Katoliko nang pakyawan, alahas na debosyonal, mga palamuting panrelihiyon, at mga aksesorya ng OUOOO para sa mga pandaigdigang bumibili.',
    collectionsMetaTitle: 'Mga koleksyon ng regalong Katoliko',
    collectionsMetaDescription:
      'Mag-browse ng mga regalong Katoliko at aksesoryang panrelihiyon nang pakyawan mula sa OUOOO ayon sa naka-sync na koleksyon ng produkto.',
    collectionMetaTitle: '{name} | Mga regalong Katoliko nang pakyawan',
    collectionMetaDescription:
      'Tingnan ang {name} mula sa katalogo ng mga regalong Katoliko nang pakyawan ng OUOOO at humiling ng impormasyon sa pagkuha.',
  },
  hr: {
    collections: 'Kolekcije',
    category: 'Kategorija',
    viewMore: 'Više',
    wholesaleCatalog: 'Katalog za veleprodaju',
    productsHeading: 'Katoli\u010dki darovi i vjerski dodaci za kupce na veliko.',
    productsIntro:
      'Istra\u017eite provjerene pojedinosti proizvoda, materijale, varijante i pobo\u017eni kontekst. Za svaki proizvod navedena je veleprodajna jedini\u010dna cijena. Kontaktirajte nas za popuste na koli\u010dinu i pojedinosti nabave.',
    productCollectionsAria: 'Kolekcije proizvoda',
    showingProducts: 'Prikaz {shown} od {total} sinkroniziranih proizvoda',
    previous: 'Prethodno',
    next: 'Sljede\u0107e',
    pageOf: 'Stranica {page} od {pages}',
    browseBySeries: 'Pregledaj po serijama',
    collectionsHeading: 'Kolekcije katoli\u010dkih darova',
    collectionsIntro:
      'Kolekcije se sinkroniziraju iz na\u0161eg kataloga proizvoda, pa se nove kategorije ovdje pojavljuju automatski.',
    product: 'proizvod',
    products: 'proizvoda',
    productSeries: 'Serija proizvoda',
    synchronizedInCollection: '{count} sinkroniziranih {items} u ovoj kolekciji.',
    perUnit: '/ komad',
    viewProduct: 'Pogledaj {title}',
    productsMetaTitle: 'Katoli\u010dki darovi na veliko i vjerski dodaci',
    productsMetaDescription:
      'Pregledajte veleprodajne katoli\u010dke darove, pobo\u017ene dragulje, vjerske ukrase i dodatke OUOOO za me\u0111unarodne kupce.',
    collectionsMetaTitle: 'Kolekcije katoli\u010dkih darova',
    collectionsMetaDescription:
      'Pregledajte veleprodajne katoli\u010dke darove i vjerske dodatke OUOOO po sinkroniziranim kolekcijama proizvoda.',
    collectionMetaTitle: '{name} | Katoli\u010dki darovi na veliko',
    collectionMetaDescription:
      'Pregledajte {name} iz veleprodajnog kataloga katoli\u010dkih darova OUOOO i zatra\u017eite informacije o nabavi.',
  },
  sl: {
    collections: 'Kolekcije',
    category: 'Kategorija',
    viewMore: 'Več',
    wholesaleCatalog: 'Katalog za veleprodajo',
    productsHeading: 'Katoli\u0161ka darila in verski dodatki za kupce na debelo.',
    productsIntro:
      'Razi\u0161\u010dite preverjene podrobnosti izdelkov, materiale, razli\u010dice in pobo\u017enostni kontekst. Za vsak izdelek je navedena veleprodajna cena na enoto. Kontaktirajte nas za koli\u010dinske popuste in podrobnosti nabave.',
    productCollectionsAria: 'Zbirke izdelkov',
    showingProducts: 'Prikazujem {shown} od {total} sinhroniziranih izdelkov',
    previous: 'Prej\u0161nja',
    next: 'Naslednja',
    pageOf: 'Stran {page} od {pages}',
    browseBySeries: 'Brskaj po serijah',
    collectionsHeading: 'Zbirke katoli\u0161kih daril',
    collectionsIntro:
      'Zbirke se sinhronizirajo iz na\u0161ega kataloga izdelkov, zato se nove kategorije tukaj pojavijo samodejno.',
    product: 'izdelek',
    products: 'izdelki',
    productSeries: 'Serija izdelkov',
    synchronizedInCollection: '{count} sinhroniziranih {items} v tej zbirki.',
    perUnit: '/ kos',
    viewProduct: 'Oglej si {title}',
    productsMetaTitle: 'Katoli\u0161ka darila na debelo in verski dodatki',
    productsMetaDescription:
      'Razi\u0161\u010dite veleprodajna katoli\u0161ka darila, pobo\u017ene dragulje, verske okraske in dodatke OUOOO za mednarodne kupce.',
    collectionsMetaTitle: 'Zbirke katoli\u0161kih daril',
    collectionsMetaDescription:
      'Brskajte po veleprodajnih katoli\u0161kih darilih in verskih dodatkih OUOOO po sinhroniziranih zbirkah izdelkov.',
    collectionMetaTitle: '{name} | Katoli\u0161ka darila na debelo',
    collectionMetaDescription:
      'Razi\u0161\u010dite {name} v veleprodajnem katalogu katoli\u0161kih daril OUOOO in zaprosite za informacije o nabavi.',
  },
  ro: {
    collections: 'Colec\u021bii',
    category: 'Categorie',
    viewMore: 'Mai mult',
    wholesaleCatalog: 'Catalog en-gros',
    productsHeading: 'Cadouri catolice \u0219i accesorii religioase pentru cump\u0103r\u0103torii en-gros.',
    productsIntro:
      'Exploreaz\u0103 detalii verificate despre produse, materiale, variante \u0219i context devo\u021bional. Pre\u021bul unitar en-gros este afi\u0219at pentru fiecare produs. Contacteaz\u0103-ne pentru reduceri la cantitate \u0219i detalii de aprovizionare.',
    productCollectionsAria: 'Colec\u021bii de produse',
    showingProducts: 'Se afi\u0219eaz\u0103 {shown} din {total} produse sincronizate',
    previous: 'Anterior',
    next: 'Urm\u0103torul',
    pageOf: 'Pagina {page} din {pages}',
    browseBySeries: 'R\u0103sfoi\u021bi dup\u0103 serii',
    collectionsHeading: 'Colec\u021bii de cadouri catolice',
    collectionsIntro:
      'Colec\u021biile sunt sincronizate din catalogul nostru de produse, astfel \u00eenc\u00e2t noile categorii apar aici automat.',
    product: 'produs',
    products: 'produse',
    productSeries: 'Serie de produse',
    synchronizedInCollection: '{count} de {items} sincronizate \u00een aceast\u0103 colec\u021bie.',
    perUnit: '/ bucat\u0103',
    viewProduct: 'Vezi {title}',
    productsMetaTitle: 'Cadouri catolice en-gros \u0219i accesorii religioase',
    productsMetaDescription:
      'Descoper\u0103 cadouri catolice en-gros, bijuterii devo\u021bionale, ornamente religioase \u0219i accesorii OUOOO pentru cump\u0103r\u0103tori interna\u021bionali.',
    collectionsMetaTitle: 'Colec\u021bii de cadouri catolice',
    collectionsMetaDescription:
      'Exploreaz\u0103 cadourile catolice \u0219i accesoriile religioase en-gros OUOOO dup\u0103 colec\u021bii de produse sincronizate.',
    collectionMetaTitle: '{name} | Cadouri catolice en-gros',
    collectionMetaDescription:
      'Descoper\u0103 {name} din catalogul de cadouri catolice en-gros OUOOO \u0219i solicit\u0103 informa\u021bii de aprovizionare.',
  },
  ar: {
    collections: '\u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a',
    category: 'الفئة',
    viewMore: 'المزيد',
    wholesaleCatalog: '\u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u062c\u0645\u0644\u0629',
    productsHeading:
      '\u0647\u062f\u0627\u064a\u0627 \u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a \u062f\u064a\u0646\u064a\u0629 \u0644\u0645\u0634\u062a\u0631\u064a \u0627\u0644\u062c\u0645\u0644\u0629.',
    productsIntro:
      '\u0627\u0633\u062a\u0639\u0631\u0636 \u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u0648\u062b\u0642\u0629 \u0648\u0627\u0644\u0645\u0648\u0627\u062f \u0648\u0627\u0644\u0623\u0646\u0648\u0627\u0639 \u0648\u0627\u0644\u0633\u064a\u0627\u0642 \u0627\u0644\u062f\u064a\u0646\u064a. \u064a\u064f\u062f\u0631\u062c \u0633\u0639\u0631 \u0627\u0644\u0648\u062d\u062f\u0629 \u0628\u0627\u0644\u062c\u0645\u0644\u0629 \u0644\u0643\u0644 \u0645\u0646\u062a\u062c. \u062a\u0648\u0627\u0635\u0644 \u0645\u0639\u0646\u0627 \u0644\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u062e\u0635\u0648\u0645\u0627\u062a \u0627\u0644\u0643\u0645\u064a\u0627\u062a \u0648\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062a\u0648\u0631\u064a\u062f.',
    productCollectionsAria:
      '\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    showingProducts:
      '\u0639\u0631\u0636 {shown} \u0645\u0646 {total} \u0645\u0646\u062a\u062c\u064b\u0627 \u0645\u062a\u0632\u0627\u0645\u0646\u064b\u0627',
    previous: '\u0627\u0644\u0633\u0627\u0628\u0642',
    next: '\u0627\u0644\u062a\u0627\u0644\u064a',
    pageOf: '\u0627\u0644\u0635\u0641\u062d\u0629 {page} \u0645\u0646 {pages}',
    browseBySeries:
      '\u062a\u0635\u0641\u062d \u062d\u0633\u0628 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a',
    collectionsHeading:
      '\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0647\u062f\u0627\u064a\u0627 \u0627\u0644\u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629',
    collectionsIntro:
      '\u062a\u062a\u0645 \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0645\u0646 \u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0644\u062f\u064a\u0646\u0627\u060c \u0644\u0630\u0644\u0643 \u062a\u0638\u0647\u0631 \u0627\u0644\u0641\u0626\u0627\u062a \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0647\u0646\u0627 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627.',
    product: '\u0645\u0646\u062a\u062c',
    products: '\u0645\u0646\u062a\u062c\u0627\u062a',
    productSeries: '\u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a',
    synchronizedInCollection:
      '{count} \u0645\u0646\u062a\u062c\u064b\u0627 \u0645\u062a\u0632\u0627\u0645\u0646\u064b\u0627 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0645\u062c\u0645\u0648\u0639\u0629.',
    perUnit: '/ \u0644\u0644\u0642\u0637\u0639\u0629',
    viewProduct: '\u0639\u0631\u0636 {title}',
    productsMetaTitle:
      '\u0647\u062f\u0627\u064a\u0627 \u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629 \u0628\u0627\u0644\u062c\u0645\u0644\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a \u062f\u064a\u0646\u064a\u0629',
    productsMetaDescription:
      '\u0627\u0633\u062a\u0639\u0631\u0636 \u0647\u062f\u0627\u064a\u0627 \u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629 \u0628\u0627\u0644\u062c\u0645\u0644\u0629 \u0648\u0645\u062c\u0648\u0647\u0631\u0627\u062a \u062f\u064a\u0646\u064a\u0629 \u0648\u0632\u062e\u0627\u0631\u0641 \u062f\u064a\u0646\u064a\u0629 \u0648\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a \u0645\u0646 OUOOO \u0644\u0644\u0645\u0634\u062a\u0631\u064a\u0646 \u0627\u0644\u062f\u0648\u0644\u064a\u064a\u0646.',
    collectionsMetaTitle:
      '\u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0647\u062f\u0627\u064a\u0627 \u0627\u0644\u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629',
    collectionsMetaDescription:
      '\u0627\u0633\u062a\u0639\u0631\u0636 \u0627\u0644\u0647\u062f\u0627\u064a\u0627 \u0627\u0644\u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629 \u0648\u0627\u0644\u0625\u0643\u0633\u0633\u0648\u0627\u0631\u0627\u062a \u0627\u0644\u062f\u064a\u0646\u064a\u0629 \u0628\u0627\u0644\u062c\u0645\u0644\u0629 \u0645\u0646 OUOOO \u062d\u0633\u0628 \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0645\u062a\u0632\u0627\u0645\u0646\u0629.',
    collectionMetaTitle:
      '{name} | \u0647\u062f\u0627\u064a\u0627 \u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629 \u0628\u0627\u0644\u062c\u0645\u0644\u0629',
    collectionMetaDescription:
      '\u0627\u0633\u062a\u0639\u0631\u0636 {name} \u0645\u0646 \u0643\u062a\u0627\u0644\u0648\u062c \u0627\u0644\u0647\u062f\u0627\u064a\u0627 \u0627\u0644\u0643\u0627\u062b\u0648\u0644\u064a\u0643\u064a\u0629 \u0628\u0627\u0644\u062c\u0645\u0644\u0629 OUOOO \u0648\u0627\u0637\u0644\u0628 \u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u062a\u0648\u0631\u064a\u062f.',
  },
  'zh-hant': {
    collections: '\u5206\u985e',
    category: '分類',
    viewMore: '更多',
    wholesaleCatalog: '\u6279\u767c\u76ee\u9304',
    productsHeading:
      '\u9762\u5411\u6279\u767c\u8cb7\u5bb6\u7684\u5929\u4e3b\u6559\u79ae\u54c1\u8207\u5b97\u6559\u98fe\u54c1\u3002',
    productsIntro:
      '\u700f\u89bd\u7d93\u6838\u5be6\u7684\u5546\u54c1\u8a73\u60c5\u3001\u6750\u8cea\u3001\u6b3e\u5f0f\u8207\u5b97\u6559\u80cc\u666f\u3002\u6bcf\u4ef6\u5546\u54c1\u5747\u5217\u51fa\u6279\u767c\u55ae\u50f9\u3002\u5982\u9700\u6279\u91cf\u6298\u6263\u8207\u63a1\u8cfc\u8a73\u60c5\uff0c\u8acb\u806f\u7e6b\u6211\u5011\u3002',
    productCollectionsAria: '\u7522\u54c1\u5206\u985e',
    showingProducts: '\u986f\u793a {shown}/{total} \u500b\u5df2\u540c\u6b65\u5546\u54c1',
    previous: '\u4e0a\u4e00\u9801',
    next: '\u4e0b\u4e00\u9801',
    pageOf: '\u7b2c {page} \u9801\uff0c\u5171 {pages} \u9801',
    browseBySeries: '\u700f\u89bd\u5206\u985e',
    collectionsHeading: '\u5929\u4e3b\u6559\u79ae\u54c1\u5206\u985e',
    collectionsIntro:
      '\u5206\u985e\u5167\u5bb9\u81ea\u52d5\u540c\u6b65\u81ea\u6211\u5011\u7684\u7522\u54c1\u76ee\u9304\uff0c\u65b0\u7684\u7522\u54c1\u985e\u5225\u6703\u81ea\u52d5\u986f\u793a\u5728\u9019\u88e1\u3002',
    product: '\u4ef6\u5546\u54c1',
    products: '\u4ef6\u5546\u54c1',
    productSeries: '\u7522\u54c1\u7cfb\u5217',
    synchronizedInCollection: '\u6b64\u5206\u985e\u4e2d\u5171\u6709 {count} \u4ef6\u5df2\u540c\u6b65\u5546\u54c1\u3002',
    perUnit: '/ \u4ef6',
    viewProduct: '\u67e5\u770b {title}',
    productsMetaTitle: '\u6279\u767c\u5929\u4e3b\u6559\u79ae\u54c1\u8207\u5b97\u6559\u98fe\u54c1',
    productsMetaDescription:
      '\u700f\u89bd OUOOO \u6279\u767c\u5929\u4e3b\u6559\u79ae\u54c1\u3001\u5fe0\u79ae\u92d0\u98fe\u3001\u5b97\u6559\u88dd\u98fe\u8207\u98fe\u54c1\uff0c\u70ba\u570b\u969b\u8cb7\u5bb6\u63d0\u4f9b\u91c7\u8cfc\u4f86\u6e90\u3002',
    collectionsMetaTitle: '\u5929\u4e3b\u6559\u79ae\u54c1\u5206\u985e',
    collectionsMetaDescription:
      '\u6309\u5df2\u540c\u6b65\u7684\u7522\u54c1\u5206\u985e\u700f\u89bd OUOOO \u6279\u767c\u5929\u4e3b\u6559\u79ae\u54c1\u8207\u5b97\u6559\u98fe\u54c1\u3002',
    collectionMetaTitle: '{name} | \u6279\u767c\u5929\u4e3b\u6559\u79ae\u54c1',
    collectionMetaDescription:
      '\u5f9e OUOOO \u6279\u767c\u5929\u4e3b\u6559\u79ae\u54c1\u76ee\u9304\u700f\u89bd {name}\uff0c\u4e26\u8acb\u6c42\u63a1\u8cfc\u8a73\u60c5\u3002',
  },
  'zh-hans': {
    collections: '\u5206\u7c7b',
    category: '分类',
    viewMore: '更多',
    wholesaleCatalog: '\u6279\u53d1\u76ee\u5f55',
    productsHeading:
      '\u9762\u5411\u6279\u53d1\u4e70\u5bb6\u7684\u5929\u4e3b\u6559\u793c\u54c1\u4e0e\u5b97\u6559\u9970\u54c1\u3002',
    productsIntro:
      '\u6d4f\u89c8\u7ecf\u8fc7\u6838\u5b9e\u7684\u5546\u54c1\u8be6\u60c5\u3001\u6750\u8d28\u3001\u6b3e\u5f0f\u4e0e\u5b97\u6559\u80cc\u666f\u3002\u6bcf\u4ef6\u5546\u54c1\u5747\u5217\u51fa\u6279\u53d1\u5355\u4ef7\u3002\u5982\u9700\u6279\u91cf\u6298\u6263\u4e0e\u91c7\u8d2d\u8be6\u60c5\uff0c\u8bf7\u8054\u7cfb\u6211\u4eec\u3002',
    productCollectionsAria: '\u4ea7\u54c1\u5206\u7c7b',
    showingProducts: '\u663e\u793a {shown}/{total} \u4e2a\u5df2\u540c\u6b65\u5546\u54c1',
    previous: '\u4e0a\u4e00\u9875',
    next: '\u4e0b\u4e00\u9875',
    pageOf: '\u7b2c {page} \u9875\uff0c\u5171 {pages} \u9875',
    browseBySeries: '\u6d4f\u89c8\u5206\u7c7b',
    collectionsHeading: '\u5929\u4e3b\u6559\u793c\u54c1\u5206\u7c7b',
    collectionsIntro:
      '\u5206\u7c7b\u5185\u5bb9\u81ea\u52a8\u540c\u6b65\u81ea\u6211\u4eec\u7684\u4ea7\u54c1\u76ee\u5f55\uff0c\u65b0\u7684\u4ea7\u54c1\u7c7b\u522b\u4f1a\u81ea\u52a8\u663e\u793a\u5728\u8fd9\u91cc\u3002',
    product: '\u4ef6\u5546\u54c1',
    products: '\u4ef6\u5546\u54c1',
    productSeries: '\u4ea7\u54c1\u7cfb\u5217',
    synchronizedInCollection: '\u6b64\u5206\u7c7b\u4e2d\u5171\u6709 {count} \u4ef6\u5df2\u540c\u6b65\u5546\u54c1\u3002',
    perUnit: '/ \u4ef6',
    viewProduct: '\u67e5\u770b {title}',
    productsMetaTitle: '\u6279\u53d1\u5929\u4e3b\u6559\u793c\u54c1\u4e0e\u5b97\u6559\u9970\u54c1',
    productsMetaDescription:
      '\u6d4f\u89c8 OUOOO \u6279\u53d1\u5929\u4e3b\u6559\u793c\u54c1\u3001\u5fe0\u793c\u9996\u9970\u3001\u5b97\u6559\u88c5\u9970\u4e0e\u9970\u54c1\uff0c\u4e3a\u56fd\u9645\u4e70\u5bb6\u63d0\u4f9b\u91c7\u8d2d\u6765\u6e90\u3002',
    collectionsMetaTitle: '\u5929\u4e3b\u6559\u793c\u54c1\u5206\u7c7b',
    collectionsMetaDescription:
      '\u6309\u5df2\u540c\u6b65\u7684\u4ea7\u54c1\u5206\u7c7b\u6d4f\u89c8 OUOOO \u6279\u53d1\u5929\u4e3b\u6559\u793c\u54c1\u4e0e\u5b97\u6559\u9970\u54c1\u3002',
    collectionMetaTitle: '{name} | \u6279\u53d1\u5929\u4e3b\u6559\u793c\u54c1',
    collectionMetaDescription:
      '\u4ece OUOOO \u6279\u53d1\u5929\u4e3b\u6559\u793c\u54c1\u76ee\u5f55\u6d4f\u89c8 {name}\uff0c\u5e76\u8bf7\u6c42\u91c7\u8d2d\u8be6\u60c5\u3002',
  },
};

const table: Record<keyof typeof english, string> = { ...english, ...(localized[BUILD_LOCALE] || {}) };

export type UiKey = keyof typeof english;

export function ui(key: UiKey, params?: Record<string, string | number>): string {
  const template = table[key] ?? english[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    params && name in params ? String(params[name]) : match
  );
}
