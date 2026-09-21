import type { SiteLocaleCode } from "./site-locales";

interface SupportCopy {
  title: string;
  languages: string;
  contact: string;
  contactAdvice: string;
  quickHelp: string;
  connect: string;
  webPurchases: string;
  webInstructions: string;
  secureLink: string;
  webSpace: string;
  appLink: string;
  appInstructions: string;
  notifications: string;
  notificationInstructions: string;
  friends: string;
  friendInstructions: string;
  seller: string;
  unavailable: string;
  mediator: string;
  controls: string;
}

export const SUPPORT_COPY: Record<SiteLocaleCode, SupportCopy> = {
  "en": {
    "title": "Cookie Build Support",
    "languages": "Support is available in English and French.",
    "contact": "Contact",
    "contactAdvice": "Include your Minecraft name, Java or Bedrock edition, app version, device model and a short description. For a web purchase, include the order reference and status from purchase history. Never send passwords, temporary link codes, private keys, full card numbers or security codes.",
    "quickHelp": "Quick help",
    "connect": "Connect to the server",
    "webPurchases": "Web purchases",
    "webInstructions": "Run /support link, then open the secure linking page. Your web space contains inventory, purchase history, withdrawal options and the Stripe portal.",
    "secureLink": "Secure linking page",
    "webSpace": "Your web space",
    "appLink": "Link the app",
    "appInstructions": "Join Cookie Build, run /app link, then enter the eight-character code in the app within 10 minutes.",
    "notifications": "Notifications",
    "notificationInstructions": "Notifications stay off until you enable them in the app. Disable them at any time in Profile.",
    "friends": "Friends and parties",
    "friendInstructions": "Link a player, use an exact Minecraft name and pull to refresh. Parties support up to four players.",
    "seller": "Seller information",
    "unavailable": "Purchases are currently unavailable. Contact support with any questions.",
    "mediator": "Consumer mediator",
    "controls": "Privacy and account controls"
  },
  "fr": {
    "title": "Assistance Cookie Build",
    "languages": "L’assistance est disponible en français et en anglais.",
    "contact": "Contact",
    "contactAdvice": "Indiquez votre pseudo Minecraft, l’édition Java ou Bedrock, la version de l’app, le modèle d’appareil et une brève description. Pour un achat web, indiquez la référence de commande et son statut dans l’historique. N’envoyez jamais de mot de passe, code temporaire, clé privée, numéro de carte complet ou cryptogramme.",
    "quickHelp": "Aide rapide",
    "connect": "Se connecter au serveur",
    "webPurchases": "Achats web",
    "webInstructions": "Exécutez /support link, puis ouvrez la page d’association sécurisée. Votre espace web contient l’inventaire, l’historique des achats, les options de rétractation et le portail Stripe.",
    "secureLink": "Page d’association sécurisée",
    "webSpace": "Votre espace web",
    "appLink": "Associer l’application",
    "appInstructions": "Rejoignez Cookie Build, exécutez /app link, puis saisissez le code de huit caractères dans l’app sous 10 minutes.",
    "notifications": "Notifications",
    "notificationInstructions": "Elles restent désactivées tant que vous ne les activez pas dans l’app. Désactivez-les à tout moment dans Profil.",
    "friends": "Amis et groupes",
    "friendInstructions": "Associez un joueur, utilisez son pseudo Minecraft exact et tirez pour actualiser. Les groupes accueillent jusqu’à quatre joueurs.",
    "seller": "Informations sur le vendeur",
    "unavailable": "Les achats sont actuellement indisponibles. Contactez l’assistance pour toute question.",
    "mediator": "Médiateur de la consommation",
    "controls": "Confidentialité et gestion du compte"
  },
  "de": {
    "title": "Cookie Build Support",
    "languages": "Support ist auf Englisch und Französisch verfügbar.",
    "contact": "Kontakt",
    "contactAdvice": "Nenne deinen Minecraft-Namen, Java- oder Bedrock-Edition, App-Version, Gerätemodell und eine kurze Beschreibung. Bei Webkäufen gib Bestellnummer und Status aus dem Verlauf an. Sende niemals Passwörter, temporäre Verknüpfungscodes, private Schlüssel, vollständige Kartennummern oder Sicherheitscodes.",
    "quickHelp": "Schnelle Hilfe",
    "connect": "Mit dem Server verbinden",
    "webPurchases": "Webkäufe",
    "webInstructions": "Führe /support link aus und öffne die sichere Verknüpfungsseite. Dein Webbereich enthält Inventar, Kaufverlauf, Widerrufsoptionen und das Stripe-Portal.",
    "secureLink": "Sichere Verknüpfungsseite",
    "webSpace": "Dein Webbereich",
    "appLink": "App verknüpfen",
    "appInstructions": "Tritt Cookie Build bei, führe /app link aus und gib den achtstelligen Code innerhalb von 10 Minuten in der App ein.",
    "notifications": "Benachrichtigungen",
    "notificationInstructions": "Sie bleiben aus, bis du sie in der App aktivierst. Im Profil kannst du sie jederzeit deaktivieren.",
    "friends": "Freunde und Gruppen",
    "friendInstructions": "Verknüpfe einen Spieler, nutze den exakten Minecraft-Namen und ziehe zum Aktualisieren. Gruppen unterstützen bis zu vier Spieler.",
    "seller": "Angaben zum Verkäufer",
    "unavailable": "Käufe sind derzeit nicht verfügbar. Bei Fragen wende dich an den Support.",
    "mediator": "Verbraucherschlichtung",
    "controls": "Datenschutz und Kontoverwaltung"
  },
  "it": {
    "title": "Assistenza Cookie Build",
    "languages": "L’assistenza è disponibile in inglese e francese.",
    "contact": "Contatti",
    "contactAdvice": "Indica nome Minecraft, edizione Java o Bedrock, versione dell’app, modello del dispositivo e una breve descrizione. Per acquisti web, includi riferimento e stato dell’ordine dalla cronologia. Non inviare mai password, codici temporanei, chiavi private, numeri completi di carte o codici di sicurezza.",
    "quickHelp": "Aiuto rapido",
    "connect": "Connettiti al server",
    "webPurchases": "Acquisti web",
    "webInstructions": "Esegui /support link, poi apri la pagina di collegamento sicuro. Il tuo spazio web contiene inventario, cronologia degli acquisti, opzioni di recesso e portale Stripe.",
    "secureLink": "Collegamento sicuro",
    "webSpace": "Il tuo spazio web",
    "appLink": "Collega l’app",
    "appInstructions": "Entra su Cookie Build, esegui /app link e inserisci il codice di otto caratteri nell’app entro 10 minuti.",
    "notifications": "Notifiche",
    "notificationInstructions": "Restano disattivate finché non le abiliti nell’app. Puoi disattivarle in qualsiasi momento nel Profilo.",
    "friends": "Amici e gruppi",
    "friendInstructions": "Collega un giocatore, usa il nome Minecraft esatto e trascina per aggiornare. I gruppi supportano fino a quattro giocatori.",
    "seller": "Informazioni sul venditore",
    "unavailable": "Gli acquisti non sono disponibili al momento. Contatta l’assistenza per qualsiasi domanda.",
    "mediator": "Mediatore dei consumatori",
    "controls": "Privacy e gestione dell’account"
  },
  "bg": {
    "title": "Поддръжка на Cookie Build",
    "languages": "Поддръжката е на английски и френски.",
    "contact": "Контакт",
    "contactAdvice": "Посочи името си в Minecraft, изданието Java или Bedrock, версията на приложението, модела на устройството и кратко описание. За уеб покупка добави номера и състоянието на поръчката от историята. Никога не изпращай пароли, временни кодове, частни ключове, пълни номера на карти или кодове за сигурност.",
    "quickHelp": "Бърза помощ",
    "connect": "Свързване със сървъра",
    "webPurchases": "Уеб покупки",
    "webInstructions": "Изпълни /support link и отвори страницата за защитено свързване. Уеб профилът съдържа инвентар, история на покупките, възможности за отказ и портала Stripe.",
    "secureLink": "Защитено свързване",
    "webSpace": "Твоят уеб профил",
    "appLink": "Свържи приложението",
    "appInstructions": "Влез в Cookie Build, изпълни /app link и въведи осемзнаковия код в приложението до 10 минути.",
    "notifications": "Известия",
    "notificationInstructions": "Известията остават изключени, докато не ги активираш в приложението. Можеш да ги изключиш по всяко време в Профил.",
    "friends": "Приятели и групи",
    "friendInstructions": "Свържи играч, използвай точното му Minecraft име и издърпай за обновяване. Групите поддържат до четирима играчи.",
    "seller": "Данни за продавача",
    "unavailable": "Покупките в момента не са достъпни. Свържи се с поддръжката при въпроси.",
    "mediator": "Потребителски медиатор",
    "controls": "Поверителност и управление на акаунта"
  },
  "es": {
    "title": "Soporte de Cookie Build",
    "languages": "El soporte está disponible en inglés y francés.",
    "contact": "Contacto",
    "contactAdvice": "Incluye tu nombre de Minecraft, edición Java o Bedrock, versión de la app, modelo del dispositivo y una breve descripción. Para una compra web, indica la referencia y el estado del pedido en el historial. Nunca envíes contraseñas, códigos temporales, claves privadas, números completos de tarjetas ni códigos de seguridad.",
    "quickHelp": "Ayuda rápida",
    "connect": "Conectarse al servidor",
    "webPurchases": "Compras web",
    "webInstructions": "Ejecuta /support link y abre la página de vinculación segura. Tu espacio web contiene inventario, historial de compras, opciones de desistimiento y el portal de Stripe.",
    "secureLink": "Vinculación segura",
    "webSpace": "Tu espacio web",
    "appLink": "Vincular la app",
    "appInstructions": "Entra en Cookie Build, ejecuta /app link e introduce el código de ocho caracteres en la app en un plazo de 10 minutos.",
    "notifications": "Notificaciones",
    "notificationInstructions": "Permanecen desactivadas hasta que las actives en la app. Puedes desactivarlas en cualquier momento desde Perfil.",
    "friends": "Amigos y grupos",
    "friendInstructions": "Vincula un jugador, usa su nombre exacto de Minecraft y desliza para actualizar. Los grupos admiten hasta cuatro jugadores.",
    "seller": "Información del vendedor",
    "unavailable": "Las compras no están disponibles actualmente. Contacta con soporte si tienes preguntas.",
    "mediator": "Mediador de consumo",
    "controls": "Privacidad y gestión de la cuenta"
  },
  "hi": {
    "title": "Cookie Build सहायता",
    "languages": "सहायता अंग्रेज़ी और फ़्रेंच में उपलब्ध है।",
    "contact": "संपर्क",
    "contactAdvice": "अपना Minecraft नाम, Java या Bedrock संस्करण, ऐप संस्करण, डिवाइस मॉडल और संक्षिप्त विवरण भेजें। वेब खरीद के लिए इतिहास से ऑर्डर संदर्भ और स्थिति शामिल करें। पासवर्ड, अस्थायी लिंक कोड, निजी कुंजी, पूरा कार्ड नंबर या सुरक्षा कोड कभी न भेजें।",
    "quickHelp": "तुरंत मदद",
    "connect": "सर्वर से जुड़ें",
    "webPurchases": "वेब खरीद",
    "webInstructions": "/support link चलाएँ, फिर सुरक्षित लिंक पेज खोलें। आपके वेब खाते में इन्वेंटरी, खरीद इतिहास, खरीद से पीछे हटने के विकल्प और Stripe पोर्टल हैं।",
    "secureLink": "सुरक्षित लिंक पेज",
    "webSpace": "आपका वेब खाता",
    "appLink": "ऐप लिंक करें",
    "appInstructions": "Cookie Build से जुड़ें, /app link चलाएँ और 10 मिनट के भीतर आठ अक्षरों का कोड ऐप में डालें।",
    "notifications": "सूचनाएँ",
    "notificationInstructions": "जब तक आप ऐप में इन्हें चालू न करें, सूचनाएँ बंद रहती हैं। प्रोफ़ाइल से इन्हें कभी भी बंद करें।",
    "friends": "दोस्त और समूह",
    "friendInstructions": "खिलाड़ी लिंक करें, उसका सही Minecraft नाम इस्तेमाल करें और ताज़ा करने के लिए नीचे खींचें। समूह में अधिकतम चार खिलाड़ी हो सकते हैं।",
    "seller": "विक्रेता की जानकारी",
    "unavailable": "खरीद अभी उपलब्ध नहीं है। सवाल होने पर सहायता से संपर्क करें।",
    "mediator": "उपभोक्ता मध्यस्थ",
    "controls": "गोपनीयता और खाता नियंत्रण"
  },
  "pt-BR": {
    "title": "Suporte Cookie Build",
    "languages": "O suporte está disponível em inglês e francês.",
    "contact": "Contato",
    "contactAdvice": "Informe seu nome no Minecraft, edição Java ou Bedrock, versão do app, modelo do aparelho e uma breve descrição. Para compras web, inclua a referência e o status do pedido no histórico. Nunca envie senhas, códigos temporários, chaves privadas, números completos de cartões ou códigos de segurança.",
    "quickHelp": "Ajuda rápida",
    "connect": "Conectar ao servidor",
    "webPurchases": "Compras web",
    "webInstructions": "Execute /support link e abra a página de vinculação segura. Seu espaço web contém inventário, histórico de compras, opções de desistência e o portal Stripe.",
    "secureLink": "Vinculação segura",
    "webSpace": "Seu espaço web",
    "appLink": "Vincular o app",
    "appInstructions": "Entre no Cookie Build, execute /app link e digite o código de oito caracteres no app em até 10 minutos.",
    "notifications": "Notificações",
    "notificationInstructions": "Elas ficam desativadas até você ativá-las no app. Desative a qualquer momento em Perfil.",
    "friends": "Amigos e grupos",
    "friendInstructions": "Vincule um jogador, use o nome exato do Minecraft e puxe para atualizar. Os grupos aceitam até quatro jogadores.",
    "seller": "Informações do vendedor",
    "unavailable": "As compras estão indisponíveis no momento. Fale com o suporte se tiver dúvidas.",
    "mediator": "Mediador de consumo",
    "controls": "Privacidade e gestão da conta"
  }
};
