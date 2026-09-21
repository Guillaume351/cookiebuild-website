import type { SiteLocaleCode } from "./site-locales";

export interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  after?: string[];
  link?: { path: string; label: string };
}
export interface LegalDocument {
  title: string;
  updated: string;
  sections: LegalSection[];
}
export interface LegalTranslation {
  privacy: LegalDocument;
  terms: LegalDocument;
  sellerUnavailable: string;
  businessId: string;
  vat: string;
  mediator: string;
}
export type TranslatedLegalLocale = Exclude<SiteLocaleCode, "en" | "fr">;

// Translations of the existing September 5, 2026 policies. The original English
// and French text remains in the page templates, including its seller bindings.
export const LEGAL_COPY: Record<TranslatedLegalLocale, LegalTranslation> = {
  de: {
    sellerUnavailable: "Cookie Build; Käufe sind derzeit nicht verfügbar",
    businessId: "Unternehmensnummer", vat: "USt-IdNr.", mediator: "Verbraucherschlichtungsstelle",
    privacy: {
      title: "Datenschutzerklärung", updated: "Gültig und zuletzt aktualisiert: 5. September 2026",
      sections: [
        { title: "Verantwortlicher und Geltungsbereich", paragraphs: ["Cookie Build wird von Guillaume Claverie betrieben. Er ist für die personenbezogenen Daten verantwortlich, die vom Minecraft-Server, der Website und der Begleit-App von Cookie Build verarbeitet werden. Fragen und Anträge zum Datenschutz richten Sie an support@cookie-build.com. Diese Erklärung gilt für die App, die Website und die Spieldienste."] },
        { title: "Verarbeitete Daten", items: [
          "Eine pseudonyme Firebase-Kennung, die bei der anonymen Authentifizierung erstellt wird.",
          "Von Firebase automatisch verarbeitete technische Authentifizierungsdiagnosen, etwa IP-Adresse, Betriebssystem, Gerätemodell, Marke, Bauform, Installationsprogramm, SDK-Versionen und Firebase-App-Kennung.",
          "Minecraft-UUID, Anzeigename, Java- oder Bedrock-Edition, Verknüpfungsstatus und Spielstatistiken.",
          "Persönlicher Saisonrang, Spielverlauf und Aktivität je Spiel, gesamte Minispiel-XP, Erfolge, verdiente Münzen, freigeschaltete und gewählte Kits sowie täglicher und wöchentlicher Zielfortschritt. Ziele werden nach UTC zurückgesetzt.",
          "Skyblock-Inselmitgliedschaft und Rolle, Fortschritt, Aufgaben, Arbeiter, Mengen im virtuellen Lager, Marktangebote, Inserate und Verkäufe sowie Status und Zeitpunkte ausfallsicherer Inventareinlagerungen.",
          "Strukturierte Freundschaftsanfragen, bestätigte Freundschaften, Blockierungen, Meldegründe, Gruppen, Mitglieder, Einladungen und Spieleraufrufe in festem Format. Die App enthält keinen freien Chat.",
          "Bei Bedarf berechnete Freundesvorschläge aus gemeinsam abgeschlossenen Partien der letzten 30 Tage. Vorschläge zeigen weder Partie, Zeitpunkt, Ergebnis, Online-Status noch letzte Aktivität und schließen bestehende Beziehungen, Blockierungen und Meldungen aus.",
          "Aus aktiven Spielsitzungen abgeleitete Anwesenheit. Sie ist nur für bestätigte Freunde und Mitglieder der aktuellen Gruppe sichtbar, abhängig von der Einstellung Freunde und Gruppe, nur Freunde oder verborgen sowie allen Blockierungen.",
          "Bei aktivierten Benachrichtigungen: Installationskennung, FCM-Token, Plattform, App-Version, Sprache, Berechtigungsstatus, Ruhezeiten, tägliche und wöchentliche Erinnerungen sowie eine optional gewählte Online-Meldung für einen bestätigten Freund. Beliebige Spieler können nicht heimlich verfolgt werden.",
          "Ein begrenzter Zähler für App-Erinnerungen im Spiel und das letzte Anzeigedatum, damit nicht verknüpfte Spieler nicht wiederholt Werbung für die App erhalten.",
          "Solange die alte Version 1.2.3 für ältere Android-Geräte verfügbar ist: Minecraft-Name, Google-Play-Produkte und Kaufverlauf, Kauftoken und Signatur sowie Aufrufinteraktionen des früheren Shops und der Google-App-Indexing-Integration.",
          "Kurzzeitig gespeicherte Sicherheitsinformationen wie IP-bezogene Zähler zur Zugriffsbeschränkung und Betriebsprotokolle.",
          "Beim Webhandel: Minecraft-UUID und Name der Handelssitzung, Hash des Sitzungstokens, Bestell- und Produktreferenzen, Gesamtpreis und Währung, Stripe-Kunden-, Checkout-, Abonnement-, Zahlungs-, Rechnungs-, Belastungs-, Erstattungs- und Streitfallkennungen und deren Status, Herkunft der Berechtigung, Kaufverlauf sowie genaue Fassung und Zeitpunkte der Bedingungen, sofortigen Ausführung, des Widerrufsverzichts, der Kündigung und des Widerrufs.",
        ], after: ["Die aktuelle App verwendet keine Werbekennungen, appübergreifende Verfolgung, Firebase Analytics, Crashlytics, präzisen Standort, Kontakte, Mikrofon, Kamera oder Zahlungsdaten. Version 1.2.3 übertrug Shop-Anfragen unverschlüsselt; das Update ersetzt diese Umsetzung auf kompatiblen Geräten. Dies betrifft nur die mobile App. Webzahlungen werden von Stripe gehostet; Stripe verarbeitet Kontakt-, Rechnungs- und Karten- oder Zahlungsdaten. Cookie Build erhält und speichert weder vollständige Kartennummern noch Kartenprüfcodes. Öffentliche Minecraft-Namen und Spielstatistiken können in Ranglisten erscheinen."] },
        { title: "Zwecke und Rechtsgrundlagen", items: [
          "Vertrag: Authentifizierung, korrekte Spielerverknüpfung, Statistiken, Verlauf, Rang, Ziele, Skyblock-Insel und Lager, Marktverwaltung mit verdienten Münzen, Kit-Freischaltung und Auswahl, datenschutzbeschränkte Anwesenheit, Freunde und Vorschläge kürzlich getroffener Spieler, Gruppen, Ereignisse und gewünschte Kontofunktionen.",
          "Vertrag und vorvertragliche Maßnahmen: Verknüpfung des Käufers, Erfüllung von Webbestellungen und Abonnements, Kaufverlauf, Kündigung und Support.",
          "Gesetzliche Pflichten: Aufbewahrung von Transaktions- und Einwilligungsnachweisen für die geltenden Buchführungs-, Steuer- und Verbraucherschutzfristen.",
          "Einwilligung: Push-Nachrichten einschließlich separat einstellbarer Spieleraufrufe, Zielerinnerungen und Online-Meldungen ausgewählter bestätigter Freunde erst nach der jeweiligen Aktivierung in der App. Die Einwilligung kann in den Einstellungen widerrufen werden. Ruhezeiten unterdrücken diese Nachrichten.",
          "Berechtigte Interessen: Kontosicherheit, Missbrauchsschutz, Bearbeitung von Meldungen, Fairplay, Fehlerdiagnose und Verfügbarkeit.",
          "Berechtigte Interessen: Abgleich von Stripe-Ereignissen, Vermeidung doppelter oder betrügerischer Bestellungen, Sitzungssicherheit, Zahlungsstreitfälle und Aufbewahrung der zur Rechtsverteidigung nötigen Mindestnachweise.",
        ], after: ["Cookie Build verkauft keine personenbezogenen Daten und nutzt sie nicht für gezielte Werbung."] },
        { title: "Empfänger und internationale Übermittlungen", paragraphs: [
          "Google Firebase stellt anonyme Authentifizierung und Push-Zustellung bereit. Die alte App teilte Aufrufinteraktionen auch mit Google App Indexing. Apple und Google vertreiben die App. Die aktuelle Website und die aktuellen Quellcode-Builds der Begleit-App laden öffentliche Minecraft-Avatare anhand der öffentlichen UUID über Cookie Build; mc-heads.net erhält dabei weder die Geräte-IP noch den Spielernamen. Alte App-Builds können Avatare weiterhin direkt laden und diese Daten offenlegen, solange sie in einem Store-Kanal verfügbar sind. Anbieter in der EU hosten Website, API, Datenbank, Überwachung und Minecraft-Server. Sie verarbeiten nur die für ihre Dienste nötigen Daten nach ihren Bedingungen und Schutzmaßnahmen. Firebase- oder Store-Dienste können Daten außerhalb des EWR unter geltenden Mechanismen wie Angemessenheitsbeschlüssen oder Standardvertragsklauseln verarbeiten.",
          "Stripe stellt gehosteten Checkout, Abrechnung, Rechnungen, Erstattungen, Streitfallbearbeitung und Kundenportal bereit. Stripe verarbeitet Zahlungsdaten nach eigenen Datenschutzhinweisen und gegebenenfalls außerhalb des EWR mit seinen geltenden Übermittlungsgarantien. Cookie Build übermittelt Minecraft-UUID und Namen sowie die zum Verarbeiten und Abgleichen nötigen Bestell- und Produktreferenzen.",
        ] },
        { title: "Aufbewahrung", items: [
          "Einmalige Verknüpfungscodes laufen nach 10 Minuten ab; Prüfdatensätze der Anfrage werden nach 7 Tagen gelöscht.",
          "Aktives Mobilprofil, Spielerverknüpfungen und Benachrichtigungsdaten bleiben gespeichert, solange sie für die App erforderlich sind oder bis das mobile Konto gelöscht wird.",
          "Freundschaften, Blockierungen und aktive Gruppen sind der Minecraft-UUID zugeordnete Serverdaten. Sie bleiben bis zur Entfernung in App oder Spiel, dem Gruppenende oder dem geltenden veröffentlichten Bereinigungszeitpunkt bestehen.",
          "Der Zeitpunkt einer Freundschaftsanfrage verhindert erneuten Kontakt für 30 Tage nach Rücknahme oder Ablehnung; er wird nach 90 Tagen gelöscht.",
          "Widerrufene Geräte werden nach 30 Tagen, widerrufene Spielerverknüpfungen nach 12 Monaten gelöscht.",
          "Abgelehnte oder abgelaufene Anfragen und Einladungen sowie beendete Gruppen werden nach 90 Tagen gelöscht.",
          "Meldungen bleiben bis zu 24 Monate gespeichert, länger nur bei einem offenen Sicherheitsfall oder einer gesetzlichen Pflicht.",
          "Zugestellte Benachrichtigungsaufträge werden nach 90 Tagen, Löschvermerke mobiler Konten nach 30 Tagen entfernt.",
          "Spielergebnisse und Gesamtstatistiken bleiben für öffentliche Ranglisten, Fairplay und Integrität während der Lebensdauer des Servers gespeichert, sofern das Gesetz keine frühere Löschung verlangt.",
          "Tägliche und wöchentliche Ziele, Erfolge, XP, Münzen und die Begrenzung der App-Werbung sind Minecraft-Spieldaten und folgen der Aufbewahrungsdauer der Spielstatistiken.",
          "Eine Web-Handelssitzung gilt höchstens 30 Tage und kann vom Spieler früher widerrufen werden. Ihr Ablauf löscht keine zugehörigen Transaktionen.",
          "Bestellungen, Zahlungsstatus, Erstattungen, Streitfälle, Rechnungen und Einwilligungsnachweise können für Buchführung, Steuern, Verbraucherschutz und Rechtsansprüche aufzubewahren sein. Für Prüfung oder Löschung von Handelsdaten wenden Sie sich an den Support. Jeder Antrag wird unter Berücksichtigung geltender Aufbewahrungspflichten einzeln geprüft.",
          "Skyblock-Inselfortschritt, Lager, Markttransaktionen und Einlagerungen zur Wiederherstellung nach Ausfällen sind Spiel- und Integritätsdaten mit der Aufbewahrungsdauer der Minecraft-Statistiken.",
        ] },
        { title: "Ihre Wahlmöglichkeiten und Rechte", paragraphs: [
          "Status, Nachrichten, Ereignisse und Ranglisten sind ohne Spielerverknüpfung nutzbar. In den Einstellungen können Sie Benachrichtigungen deaktivieren, Spieler trennen, App-Kontodaten kopieren und das mobile Konto löschen. Dies entfernt das pseudonyme Mobilprofil, Geräte, Einstellungen, Online-Meldungen einzelner Freunde und mobile Verknüpfungen. Minecraft-Name, Freundschaften, Blockierungen, Gruppen- und Sicherheitsdaten dieser Spieleridentität sowie Integritätsdaten öffentlicher Spielverläufe werden dadurch nicht gelöscht. Auch Ranggrundlagen, XP, Münzen, Erfolge, tägliche und wöchentliche Ziele sowie Skyblock-Insel-, Lager-, Markt- und Einlagerungsdaten bleiben Spieldaten mit den oben genannten eigenen Kontrollen und Fristen.",
          "Abhängig von Ihrem Aufenthaltsort können Sie Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit oder Widerspruch verlangen und Einwilligungen widerrufen. Nutzen Sie die oben genannte Kontaktadresse. Beschwerden sind bei Ihrer Datenschutzaufsicht möglich; in Frankreich ist dies die CNIL. Ohne App steht die Seite zur Kontolöschung zur Verfügung.",
          "Die Löschung des mobilen Kontos löscht nicht den gesonderten, mit Minecraft verknüpften Handelsverlauf. Ein Datenschutzantrag kann diesen einbeziehen, vorbehaltlich zwingender Aufbewahrung für Rechnungen, Buchführung, Betrugsprävention und Rechtsansprüche.",
        ], link: { path: "/account/delete", label: "Seite zur Kontolöschung" } },
        { title: "Alter und Änderungen", paragraphs: ["Die Begleit-App richtet sich an Personen ab 13 Jahren. Wer das in seinem Land geltende Alter für die Einwilligung in Online-Dienste noch nicht erreicht hat, darf Cookie Build nur mit einem Elternteil oder Erziehungsberechtigten nutzen. Wesentliche Änderungen veröffentlichen wir hier mit aktualisiertem Gültigkeitsdatum."] },
        { title: "Optionale Website-Analyse", paragraphs: ["Mit Ihrer Zustimmung verwendet Google Analytics Cookies, um öffentliche Seitenaufrufe, grobe Herkunftskategorien, Klicks zum Spiel oder zu Discord und Shop-Schritte wie Empfängerauswahl und Zahlungsbeginn zu messen. Ereignisse enthalten nur vordefinierte Seitenkategorien und Aktionen, Website-Sprache, grobe Herkunftskategorien, Produktkennungen und Edition (Java oder Bedrock), ohne Minecraft-Namen, Spielerkennungen, Anmeldecodes, Zahlungs-URLs, E-Mail-Adressen, URL-Parameter oder vollständige Herkunfts-URLs. Vor Ihrer Zustimmung wird kein Google-Analytics-Tag geladen. Ablehnung und Widerruf sind über die Analyse-Einstellungen im Seitenfuß möglich. Die Entscheidung bleibt bis zu 180 Tage gespeichert. Einwilligungsbasierte Messungen bilden nicht alle Besuche oder Käufe ab. Google erhält für den Dienst technische Verbindungsdaten; unsere Auswertung verwendet weder Werbesignale noch websiteübergreifende Nutzerkennungen. Analyse-Cookies sind auf 180 Tage begrenzt. Google kann Daten außerhalb des EWR unter seinen geltenden Übermittlungsgarantien verarbeiten."] },
      ],
    },
    terms: {
      title: "Nutzungsbedingungen", updated: "Gültig und zuletzt aktualisiert: 5. September 2026",
      sections: [
        { title: "Betreiber und Zustimmung", paragraphs: ["Cookie Build ist ein unabhängig betriebener Minecraft-Server mit Website und Begleit-App, bereitgestellt von {seller}. Durch die Nutzung stimmen Sie diesen Bedingungen und den veröffentlichten Serverregeln zu. Fragen richten Sie an support@cookie-build.com. Cookie Build ist weder mit Mojang, Microsoft, Apple oder Google verbunden noch von ihnen unterstützt."] },
        { title: "Teilnahme und Konten", paragraphs: ["Die Begleit-App richtet sich an Personen ab 13 Jahren. Falls das örtliche Recht für Online-Dienste die Zustimmung eines Elternteils oder Erziehungsberechtigten verlangt, muss diese vorliegen. Die App erstellt ein pseudonymes Gerätekonto und lässt es über einen kurzlebigen Code aus dem Spiel mit einem Minecraft-Spieler verknüpfen. Schützen Sie den Zugriff auf Gerät und Minecraft-Konto. Geben Sie Verknüpfungscodes niemals weiter."] },
        { title: "Zulässige Nutzung", paragraphs: ["Untersagt sind:"], items: ["Schummeln, Ausnutzen von Fehlern, automatisierter Missbrauch, Umgehen der Moderation oder Stören des Netzwerks;", "Belästigen, Bedrohen, Identitätsmissbrauch, Diskriminieren oder Offenlegen einer anderen Person;", "Zugriff auf fremde Konten, Verknüpfung fremder Spieler oder Umgehen von Sicherheitskontrollen;", "Wissentlich falsche Meldungen oder Missbrauch von Einladungen, Spieleraufrufen, Blockierungen und Support;", "Kopieren, Weiterverkaufen oder irreführende Darstellung von Diensten oder Marke Cookie Build."], after: ["Freunde, Gruppen und Spieleraufrufe verwenden nur vorgegebene Aktionen und Minecraft-Namen. Aufrufe sind begrenzt und können von Empfängern deaktiviert werden. Diese App-Version enthält weder öffentliche Beiträge noch freien Live-Chat."] },
        { title: "Moderation, Sperren und Beschwerden", paragraphs: ["Cookie Build kann Inhalte entfernen, Funktionen beschränken, Spieler sperren oder Zugriff beenden, soweit dies für Sicherheit, Fairplay, Dienstintegrität, Gesetzestreue oder bei wesentlichem Vertragsverstoß angemessen erforderlich ist. Schwerer oder wiederholter Missbrauch kann sofortige Maßnahmen auslösen. Wenden Sie sich zur Anfechtung per E-Mail an den Support mit Minecraft-Namen, Edition, ungefährem Datum und relevantem Kontext. Beschwerden werden von einer Person geprüft."] },
        { title: "Verfügbarkeit und Änderungen", paragraphs: ["Spiele, Karten, Statistiken, Freunde, Gruppen, Ereignisse und Benachrichtigungen können sich ändern oder wegen Wartung, Sicherheit, Softwarekompatibilität oder Ausfällen Dritter vorübergehend fehlen. Funktionen mit fehlenden Karten bleiben gesperrt, statt fehlerhaft angeboten zu werden. Diese Bedingungen können aus rechtlichen, Sicherheits- oder Produktgründen geändert werden. Wesentliche Änderungen werden mit neuem Gültigkeitsdatum vor ihrem Inkrafttreten veröffentlicht, soweit dies erforderlich ist."] },
        { title: "Käufe und Eigentum", paragraphs: ["Die App enthält einen Kit-Shop und einen Skyblock-Spielermarkt mit ausschließlich im Cookie-Build-Spiel verdienten virtuellen Münzen. Der Markt tauscht nur geeignete Skyblock-Spielressourcen gegen diese Münzen. Die App enthält keine Zahlung mit echtem Geld, Abonnements, bezahlte digitale Berechtigungen oder Umwandlung virtueller Münzen in Geld. Code, Grafiken und Marken von Cookie Build gehören den jeweiligen Rechteinhabern. Minecraft-Namen, Marken und Spielelemente gehören Mojang oder Microsoft und werden nach den geltenden Nutzungsrichtlinien verwendet. Sie behalten Rechte an eigenen Inhalten und räumen Cookie Build nur die für den Betrieb nötigen Rechte ein."] },
        { title: "Webkäufe, Abonnements und freiwillige Unterstützung", items: ["Produktinhalt, Dauer und Gesamtpreis in EUR inklusive Steuern sind vor der Anmeldung öffentlich im Katalog sichtbar. Stripe hostet die Zahlung, nachdem der Käufer den empfangenden Minecraft-Spieler verknüpft hat.", "Dauerhafte Produkte werden nach bestätigter Zahlung digital geliefert. Vor der Bestellung muss der Käufer getrennt und ausdrücklich die sofortige Ausführung verlangen und den Verlust des Widerrufsrechts mit Bereitstellung anerkennen; kein Kästchen ist vorausgewählt.", "Das monatliche Supporter-Abonnement verlängert sich monatlich. Es kann im Stripe-Portal üblicherweise zum Periodenende gekündigt werden. Erstabonnenten können innerhalb von 14 Tagen über den Kaufverlauf widerrufen, mit sofortiger Beendigung und vollständiger Erstattung.", "Erstattungen, Streitfälle, fehlgeschlagene Zahlungen, Kündigung, Widerruf von Berechtigungen und Ablauf können nur die durch die betreffende Zahlung finanzierten Zugänge aussetzen oder entfernen. Kein Kauf verschafft einen Wettbewerbsvorteil in Minispielen.", "Freiwillige Unterstützung ist ein wiederholbares Trinkgeld für den Dienst, keine gemeinnützige Spendensammlung, und gewährt weder Rang, Kosmetik, Gegenstand noch exklusiven Vorteil.", "Die mobile Begleit-App bietet keinen Echtgeldhandel, Checkout oder externen Zahlungslink. Ihr Kit-Shop verwendet ausschließlich im Spiel verdiente Münzen."], after: ["Der Käufer kann einen dauerhaften Bestellverlauf sowie Wortlaut und Zeitpunkte der Einwilligungen aus dem Webkonto herunterladen. Bei Fragen zu Zahlung, Kündigung, Widerruf oder Erstattung schreiben Sie an {support} mit der Bestellreferenz, niemals mit Kartendaten."] },
        { title: "Haftung und anwendbares Recht", paragraphs: ["Der Dienst wird mit angemessener Sorgfalt bereitgestellt; unterbrechungsfreie Verfügbarkeit und vollkommene Genauigkeit können nicht garantiert werden. Soweit gesetzlich zulässig, haftet Cookie Build nicht für mittelbare Schäden, Verlust virtuellen Fortschritts durch einen dokumentierten Ausfall oder Ausfälle fremder Plattformen. Zwingende Verbraucherrechte und gesetzlich nicht ausschließbare Haftung bleiben unberührt. Es gilt französisches Recht, ohne zwingenden Verbraucherschutz im Aufenthaltsland zu entziehen. Streitigkeiten sollten zunächst über den Support geklärt werden; zuständige Gerichte und zwingende Verbraucherrechte bleiben zugänglich."] },
        { title: "Beendigung der Nutzung", paragraphs: ["Sie können jederzeit aufhören, Minecraft-Identitäten trennen, Freundschaften und Gruppen verlassen, Benachrichtigungen deaktivieren und das mobile Konto in den Einstellungen löschen. Den Umgang mit Daten nach der Löschung beschreibt die Datenschutzerklärung."], link: { path: "/privacy", label: "Datenschutzerklärung" } },
      ],
    },
  },
  "pt-BR": {
    sellerUnavailable: "Cookie Build; as compras estão indisponíveis no momento",
    businessId: "Identificação da empresa", vat: "IVA", mediator: "Mediador de consumo",
    privacy: {
      title: "Política de Privacidade", updated: "Em vigor e última atualização: 5 de setembro de 2026",
      sections: [
        { title: "Responsável e abrangência", paragraphs: ["Cookie Build é operado por Guillaume Claverie, responsável pelos dados pessoais tratados pelo servidor Minecraft, site e aplicativo complementar Cookie Build. Para dúvidas ou solicitações de privacidade, entre em contato com support@cookie-build.com. Esta política abrange o aplicativo, o site e os serviços do jogo."] },
        { title: "Dados que tratamos", items: [
          "Identificador pseudônimo do Firebase criado pela autenticação anônima.",
          "Diagnósticos técnicos de autenticação tratados automaticamente pelo Firebase, como endereço IP, sistema operacional, modelo, marca e formato do dispositivo, instalador, versões dos SDKs e identificador do aplicativo Firebase.",
          "UUID e nome público do Minecraft, edição Java ou Bedrock, estado da vinculação e estatísticas do jogo.",
          "Classificação pessoal da temporada, histórico e atividade por jogo, XP agregada dos minijogos, conquistas, saldo de moedas ganhas, kits desbloqueados e selecionados e progresso de objetivos diários e semanais. Os objetivos são reiniciados em UTC.",
          "Participação e função na ilha Skyblock, progresso, missões, trabalhadores, quantidades no armazenamento virtual, cotações, anúncios e vendas do mercado, além do estado e dos horários de depósitos de inventário resistentes a interrupções.",
          "Solicitações e amizades aceitas, bloqueios, motivo de denúncia, grupos, membros, convites e chamadas de jogadores em formato predefinido. O aplicativo não tem chat de texto livre.",
          "Sugestões de amizade calculadas sob demanda a partir de partidas concluídas em conjunto nos últimos 30 dias. Não mostram partida, horário, pontuação, estado online nem última conexão e excluem relações existentes, bloqueios e denúncias.",
          "Presença derivada de sessões de jogo ativas, disponível apenas a amigos aceitos e membros do grupo atual, conforme a opção amigos e grupo, apenas amigos ou oculto e respeitando todos os bloqueios.",
          "Após optar por notificações: identificador de instalação, token FCM, plataforma, versão do aplicativo, idioma, estado da autorização, horários de silêncio, escolhas de lembretes diários e semanais e alerta online opcional para um amigo aceito. Cookie Build não permite acompanhar silenciosamente jogadores arbitrários.",
          "Contador limitado e data da última exibição de lembretes do aplicativo no jogo, para não repetir sua divulgação a jogadores não vinculados.",
          "Enquanto a versão antiga 1.2.3 estiver disponível para dispositivos Android antigos: nome Minecraft, produtos e histórico de compras do Google Play, token e assinatura da compra e interações de visualização usadas pela antiga loja e pela integração Google App Indexing.",
          "Informações de segurança temporárias, como contadores de limitação por IP e registros operacionais.",
          "No comércio web: UUID e nome Minecraft usados na sessão, hash do token da sessão, referências de pedidos e produtos, preço total e moeda, identificadores e estados Stripe de cliente, Checkout, assinatura, pagamento, fatura, cobrança, reembolso e contestação, origem do direito de acesso, histórico e versão exata e horários dos termos, execução imediata, renúncia ao direito de arrependimento, cancelamento e exercício desse direito.",
        ], after: ["O aplicativo atual não usa identificadores publicitários, rastreamento entre aplicativos, Firebase Analytics, Crashlytics, localização precisa, contatos, microfone, câmera ou dados de pagamento. A versão antiga 1.2.3 transmitia solicitações da loja sem criptografia; a atualização substitui essa implementação em dispositivos compatíveis. Isso se refere apenas ao aplicativo móvel. Os pagamentos web são hospedados pela Stripe, que trata dados de contato, faturamento e cartão ou pagamento. Cookie Build não recebe nem armazena números completos de cartão ou códigos de segurança. Nomes públicos Minecraft e estatísticas podem aparecer em classificações."] },
        { title: "Finalidades e bases legais", items: [
          "Contrato: autenticar o aplicativo, vincular o jogador correto, oferecer estatísticas, histórico, classificação, objetivos, gestão de ilha e armazenamento Skyblock e mercado com moedas ganhas, desbloqueio e seleção de kits com essas moedas, presença com privacidade, amizades e sugestões de jogadores recentes, grupos, eventos e controles de conta solicitados.",
          "Contrato e medidas pré-contratuais: vincular o comprador, executar pedidos e assinaturas web, mostrar o histórico e oferecer cancelamento e suporte.",
          "Obrigações legais: conservar provas de transações e consentimentos pelos períodos contábeis, fiscais e de proteção do consumidor aplicáveis.",
          "Consentimento: enviar notificações push, incluindo chamadas de jogadores, lembretes de objetivos e alertas online de amigos aceitos configuráveis separadamente, apenas após a ativação correspondente no aplicativo. O consentimento pode ser retirado nas Configurações. Os horários de silêncio suprimem essas notificações.",
          "Interesses legítimos: proteger contas, evitar abusos, moderar denúncias, manter a equidade, diagnosticar incidentes e preservar a disponibilidade.",
          "Interesses legítimos: conciliar eventos Stripe, evitar pedidos duplicados ou fraudulentos, proteger sessões, tratar contestações de pagamentos e conservar as provas mínimas necessárias à defesa de direitos.",
        ], after: ["Cookie Build não vende dados pessoais nem os usa para publicidade direcionada."] },
        { title: "Destinatários e transferências internacionais", paragraphs: [
          "Google Firebase fornece autenticação anônima e entrega de notificações. O aplicativo antigo também compartilhava interações de visualização com Google App Indexing. Apple e Google distribuem o aplicativo. O site e as versões atuais do código-fonte do aplicativo carregam avatares públicos do Minecraft pelo proxy Cookie Build usando o UUID público; mc-heads.net não recebe o IP do dispositivo solicitante nem o nome do jogador. Uma versão antiga ainda pode carregar avatares diretamente e divulgar esses dados enquanto estiver disponível em algum canal da loja. Provedores de infraestrutura na UE hospedam site, API, banco de dados, monitoramento e servidor Minecraft. Tratam apenas os dados necessários aos seus serviços, conforme seus termos e garantias de proteção. Firebase ou serviços das lojas podem tratar dados fora do EEE com mecanismos aplicáveis, como decisões de adequação ou cláusulas contratuais padrão.",
          "Stripe fornece Checkout hospedado, faturamento, faturas, reembolsos, contestações e Portal do Cliente. Atua segundo suas próprias informações de privacidade para dados de pagamento e pode tratá-los fora do EEE com suas garantias de transferência aplicáveis. Cookie Build envia UUID e nome Minecraft e referências de pedidos e produtos necessários para processar e conciliar a transação.",
        ] },
        { title: "Conservação", items: [
          "Códigos de vinculação de uso único expiram em 10 minutos; registros de auditoria do desafio são removidos após 7 dias.",
          "Perfil móvel ativo, vínculos de jogadores e dados de notificações são conservados enquanto necessários ao aplicativo ou até a exclusão da conta móvel.",
          "Amizades, bloqueios e grupos ativos são registros do servidor ligados ao UUID Minecraft. Permanecem até sua remoção no aplicativo ou jogo, o fim do grupo ou o prazo de limpeza publicado.",
          "O horário de uma solicitação de amizade impede novo contato por 30 dias após cancelamento ou recusa; é removido após 90 dias.",
          "Dispositivos revogados são removidos após 30 dias; vínculos revogados após 12 meses.",
          "Solicitações e convites recusados ou expirados e registros de grupos encerrados são removidos após 90 dias.",
          "Denúncias são conservadas por até 24 meses, ou mais enquanto houver caso de segurança ou obrigação legal em aberto.",
          "Tarefas de notificação entregues e marcadores de contas excluídas são removidos após 90 e 30 dias, respectivamente.",
          "Resultados e estatísticas agregadas permanecem durante a vida do servidor para classificações públicas, equidade e integridade das partidas, salvo exigência legal de exclusão anterior.",
          "Objetivos diários e semanais, conquistas, XP, moedas e limitador de divulgação do aplicativo são registros de jogo Minecraft e seguem o prazo das estatísticas.",
          "Uma sessão de comércio web é válida por até 30 dias e pode ser revogada antes pelo jogador. Sua expiração não elimina as transações relacionadas.",
          "Pedidos, estados de pagamento, reembolsos, contestações, faturas e provas de consentimento podem precisar ser conservados para contabilidade, tributos, proteção do consumidor e defesa de direitos. Contate o suporte para solicitar análise ou exclusão de seus registros comerciais. As solicitações são analisadas individualmente conforme as obrigações aplicáveis.",
          "Progresso da ilha Skyblock, armazenamento, transações de mercado e depósitos para recuperação de interrupções são registros de jogo e integridade e seguem o prazo das estatísticas Minecraft.",
        ] },
        { title: "Suas escolhas e seus direitos", paragraphs: [
          "Status, notícias, eventos e classificações funcionam sem vincular um jogador. Nas Configurações, é possível desativar notificações, desvincular um jogador, copiar os dados da conta e excluir a conta móvel. A exclusão remove perfil pseudônimo, dispositivos, preferências, alertas online por amigo e vínculos móveis. Não apaga nome Minecraft, amizades, bloqueios, grupos ou registros de segurança ligados ao jogador nem registros de integridade do histórico público. Também não apaga dados de classificação, XP, moedas, conquistas, objetivos diários e semanais, ilha e armazenamento Skyblock, mercado ou depósitos: são dados de jogo com controles e prazos próprios indicados acima.",
          "Conforme sua localização, você pode solicitar acesso, correção, exclusão, restrição, portabilidade ou oposição e retirar o consentimento. Use o contato acima. Você também pode reclamar à autoridade local de proteção de dados; na França, à CNIL. Há uma página para excluir a conta sem o aplicativo.",
          "Excluir a conta móvel não exclui o histórico comercial separado vinculado ao Minecraft. Uma solicitação de privacidade pode abrangê-lo, sujeita à conservação obrigatória de faturas, contabilidade, prevenção de fraude e defesa de direitos.",
        ], link: { path: "/account/delete", label: "Página de exclusão de conta" } },
        { title: "Idade e alterações", paragraphs: ["O aplicativo complementar destina-se a jogadores de 13 anos ou mais. Quem ainda não atingiu a idade de consentimento para serviços online de seu país só deve usar Cookie Build com um responsável legal. Alterações importantes serão publicadas aqui com atualização da data de vigência."] },
        { title: "Análise opcional do site", paragraphs: ["Com sua permissão, Google Analytics usa cookies para medir visitas a páginas públicas, categorias gerais de origem, cliques para o jogo ou Discord e etapas da loja, como seleção de destinatário e início do pagamento. Nossos eventos contêm apenas categorias e ações predefinidas, idioma do site, categorias gerais de origem, identificadores de produtos e edição (Java ou Bedrock), sem nomes Minecraft, identificadores de jogadores, códigos de login, URLs de pagamento, e-mails, parâmetros de URL ou URLs completas de origem. Nenhuma tag Google Analytics é carregada antes da permissão. Você pode recusar ou retirar a permissão nas preferências de análise no rodapé. A escolha é lembrada por até 180 dias. Essas medições dependentes de consentimento não representam todas as visitas ou compras. Google recebe dados técnicos de conexão necessários ao serviço; nossos relatórios não usam sinais publicitários nem identificadores de usuário entre sites. Os cookies de análise duram no máximo 180 dias. Google pode tratar dados fora do EEE conforme suas garantias de transferência aplicáveis."] },
      ],
    },
    terms: {
      title: "Termos de Uso", updated: "Em vigor e última atualização: 5 de setembro de 2026",
      sections: [
        { title: "Operador e aceitação", paragraphs: ["Cookie Build é um servidor Minecraft, site e aplicativo complementar independentes, fornecidos por {seller}. Ao usar o serviço, você aceita estes termos e as regras publicadas do servidor. Dúvidas: support@cookie-build.com. Cookie Build não é afiliado nem endossado por Mojang, Microsoft, Apple ou Google."] },
        { title: "Elegibilidade e contas", paragraphs: ["O aplicativo complementar destina-se a pessoas com 13 anos ou mais. Se a legislação local exigir consentimento dos pais para serviços online, um responsável deve autorizar o uso. O aplicativo cria uma conta pseudônima do dispositivo, que pode ser vinculada a um jogador Minecraft por um código temporário gerado no jogo. Proteja o dispositivo e a conta Minecraft. Nunca compartilhe um código de vinculação."] },
        { title: "Uso aceitável", paragraphs: ["É proibido:"], items: ["trapacear, explorar falhas, automatizar abusos, contornar a moderação ou perturbar a rede;", "assediar, ameaçar, se passar por alguém, discriminar ou expor outra pessoa;", "tentar acessar outra conta, vincular outro jogador ou contornar controles de segurança;", "enviar denúncias sabidamente falsas ou abusar de convites, chamadas de jogadores, bloqueios ou suporte;", "copiar, revender ou apresentar de forma enganosa os serviços ou a marca Cookie Build."], after: ["Amigos, grupos e chamadas de jogadores usam apenas ações predefinidas e nomes Minecraft. As chamadas têm limite de frequência e podem ser desativadas pelos destinatários. Esta versão do aplicativo não permite publicações públicas nem chat livre ao vivo."] },
        { title: "Moderação, suspensão e recurso", paragraphs: ["Cookie Build pode remover conteúdo, restringir funções, suspender um jogador ou encerrar seu acesso quando razoavelmente necessário à segurança, equidade, integridade do serviço, cumprimento legal ou diante de violação relevante destes termos. Abusos graves ou repetidos podem gerar medidas imediatas. Para contestar uma decisão, envie ao suporte nome Minecraft, edição, data aproximada e contexto relevante. Uma pessoa analisa os recursos."] },
        { title: "Disponibilidade e alterações", paragraphs: ["Jogos, mapas, estatísticas, amigos, grupos, eventos e notificações podem mudar ou ficar temporariamente indisponíveis por manutenção, segurança, compatibilidade de software ou falhas de terceiros. Funções que dependem de mapas ausentes ficam indisponíveis em vez de serem oferecidas com defeito. Os termos podem ser atualizados por mudanças legais, de segurança ou do produto. Alterações relevantes serão publicadas com nova data de vigência antes de sua aplicação quando exigido."] },
        { title: "Compras e propriedade", paragraphs: ["O aplicativo inclui uma loja de kits e um mercado Skyblock entre jogadores que usam moedas virtuais ganhas jogando Cookie Build. As vendas trocam apenas recursos Skyblock elegíveis por essas moedas. Não há pagamento em dinheiro real, assinatura, direito digital pago nem conversão de moedas virtuais em dinheiro no aplicativo. Código, arte e marca Cookie Build pertencem aos respectivos titulares. Nomes, marcas e elementos Minecraft pertencem à Mojang ou Microsoft e são usados conforme as diretrizes aplicáveis. Você mantém os direitos sobre seu próprio conteúdo e concede a Cookie Build apenas os direitos necessários ao serviço."] },
        { title: "Compras web, assinaturas e apoio voluntário", items: ["Conteúdo, duração e preço total em EUR, incluindo tributos, são públicos no catálogo antes do login. Stripe hospeda o pagamento depois que o comprador vincula o jogador Minecraft destinatário.", "Produtos permanentes são entregues digitalmente após a confirmação do pagamento. Antes de comprar, o comprador deve solicitar separada e expressamente a execução imediata e reconhecer a perda do direito de arrependimento quando o acesso for entregue; nenhuma caixa vem selecionada.", "A assinatura mensal Supporter é renovada todo mês. Pode ser cancelada no portal Stripe, normalmente ao fim do período. Na assinatura inicial, a opção de arrependimento por 14 dias no histórico permite cancelamento imediato e reembolso integral.", "Reembolsos, contestações, falhas de pagamento, cancelamento, revogação e expiração podem suspender ou remover somente o acesso financiado pelo pagamento afetado. Nenhuma compra concede vantagem competitiva em minijogos.", "Apoio voluntário é uma gorjeta repetível ao serviço, não arrecadação beneficente, e não dá classificação, cosmético, item ou vantagem exclusiva.", "O aplicativo móvel complementar não tem comércio com dinheiro real, checkout nem link de pagamento externo. Sua loja de kits usa apenas moedas ganhas no jogo."], after: ["O comprador pode baixar um histórico durável de pedidos, textos e datas de consentimento da conta web. Para suporte sobre pagamento, cancelamento, arrependimento ou reembolso, escreva a {support} com a referência do pedido, nunca com dados do cartão."] },
        { title: "Responsabilidade e legislação aplicável", paragraphs: ["O serviço é prestado com cuidado razoável, mas não se garante disponibilidade ininterrupta nem exatidão perfeita. Nos limites legais, Cookie Build não responde por perdas indiretas, progresso virtual perdido por interrupção documentada ou falhas de plataformas de terceiros. Estes termos não limitam direitos obrigatórios do consumidor nem responsabilidade legalmente inexcluível. Aplica-se a lei francesa, sem retirar as proteções obrigatórias do país do consumidor. As partes devem primeiro tentar resolver conflitos pelo suporte; tribunais competentes e direitos obrigatórios permanecem disponíveis."] },
        { title: "Encerramento do uso", paragraphs: ["Você pode parar a qualquer momento, desvincular identidades Minecraft, desfazer amizades ou sair de grupos, desativar notificações e excluir a conta móvel nas Configurações. O tratamento de dados após a exclusão é descrito na Política de Privacidade."], link: { path: "/privacy", label: "Política de Privacidade" } },
      ],
    },
  },
  bg: {
    sellerUnavailable: "Cookie Build; покупките в момента не са достъпни",
    businessId: "Идентификатор на дружеството", vat: "ДДС", mediator: "Потребителски медиатор",
    privacy: {
      title: "Политика за поверителност", updated: "В сила и последно актуализирана: 5 септември 2026 г.",
      sections: [
        { title: "Администратор и обхват", paragraphs: ["Cookie Build се управлява от Guillaume Claverie, администратор на личните данни, обработвани от Minecraft сървъра, сайта и придружаващото приложение Cookie Build. За въпроси и искания относно поверителността пишете на support@cookie-build.com. Политиката обхваща приложението, сайта и игровите услуги."] },
        { title: "Данни, които обработваме", items: [
          "Псевдонимен идентификатор във Firebase, създаден чрез анонимно удостоверяване.",
          "Техническа диагностика на удостоверяването, обработвана автоматично от Firebase: IP адрес, операционна система, модел, марка и вид на устройството, инсталатор, версии на SDK и идентификатор на приложението във Firebase.",
          "Minecraft UUID, публично име, издание Java или Bedrock, състояние на свързването и игрова статистика.",
          "Личен сезонен ранг, история и активност по игри, общ XP от миниигри, постижения, спечелени монети, отключени и избрани комплекти и напредък по дневни и седмични цели. Целите се нулират по UTC.",
          "Членство и роля в остров Skyblock, напредък, задачи, работници, количества във виртуалния склад, котировки, обяви и продажби на пазара, както и състояние и времеви отметки на внасяния в склада, устойчиви на прекъсване.",
          "Структурирани покани и приети приятелства, блокирания, причина за сигнал, групи, членове, покани и повиквания към играчи в предварително зададен формат. Приложението няма свободен текстов чат.",
          "Предложения за приятели, изчислени при поискване от съвместно завършени мачове през последните 30 дни. Те не показват мача, часа, резултата, онлайн състоянието или последното влизане и изключват съществуващи отношения, блокирания и сигнали.",
          "Присъствие, получено от активни игрови сесии. Видимо е само за приети приятели и членове на текущата група, според настройката приятели и група, само приятели или скрито и при спазване на всички блокирания.",
          "При разрешени известия: идентификатор на инсталацията, FCM токен, платформа, версия, език, състояние на разрешението, тихи часове, избор на дневни и седмични напомняния и незадължително онлайн известие за избран приет приятел. Cookie Build не позволява тайно следене на произволни играчи.",
          "Ограничен брояч и дата на последното показване на напомнянето за приложението в играта, за да не се повтаря рекламата му на несвързан играч.",
          "Докато старата версия 1.2.3 е достъпна за по-стари Android устройства: Minecraft име, продукти и история на покупките в Google Play, токен и подпис на покупката и взаимодействия при преглед, използвани от стария магазин и Google App Indexing.",
          "Краткосрочни данни за сигурност, като броячи за ограничаване на заявки по IP и оперативни дневници.",
          "За уеб търговията: Minecraft UUID и име за търговската сесия, хеш на сесийния токен, препратки към поръчки и продукти, обща цена и валута, Stripe идентификатори и състояния на клиент, Checkout, абонамент, плащане, фактура, начисление, възстановяване и спор, източник на правото за достъп, история на покупките и точната версия и времеви отметки на условията, незабавното изпълнение, отказа от право на отказ, прекратяването и действията по отказ.",
        ], after: ["Настоящото приложение не използва рекламни идентификатори, проследяване между приложения, Firebase Analytics, Crashlytics, точно местоположение, контакти, микрофон, камера или платежни данни. Старата версия 1.2.3 изпращаше заявки към магазина без криптиране; актуализацията заменя това изпълнение на съвместими устройства. Това се отнася само за мобилното приложение. Уеб плащанията се предоставят от Stripe, която обработва контактни, фактурни и картови или платежни данни. Cookie Build не получава и не съхранява пълни номера на карти или кодове за сигурност. Публични Minecraft имена и статистики могат да присъстват в класациите."] },
        { title: "Цели и правни основания", items: [
          "Договор: удостоверяване на приложението, свързване на правилния играч, статистики, история, ранг, цели, управление на остров и склад Skyblock и пазар със спечелени монети, отключване и избор на комплекти с тези монети, присъствие с ограничения за поверителност, приятели и предложения за наскоро срещнати играчи, групи, събития и заявени действия по профила.",
          "Договор и преддоговорни мерки: свързване на купувача, изпълнение на уеб поръчки и абонаменти, история на покупките, прекратяване и поддръжка.",
          "Законови задължения: съхраняване на доказателства за трансакции и съгласие за приложимите счетоводни, данъчни и потребителски срокове.",
          "Съгласие: изпращане на push известия, включително отделно настройваеми повиквания към играчи, напомняния за цели и онлайн известия за избрани приети приятели, само след съответното разрешение в приложението. Съгласието може да бъде оттеглено в настройките. Тихите часове потискат тези известия.",
          "Легитимни интереси: сигурност на профилите, предотвратяване на злоупотреби, разглеждане на сигнали, честна игра, диагностика на инциденти и наличност на услугата.",
          "Легитимни интереси: съгласуване на Stripe събития, предотвратяване на дублирани или измамни поръчки, сигурност на сесиите, платежни спорове и минимални доказателства за защита на правни претенции.",
        ], after: ["Cookie Build не продава лични данни и не ги използва за целева реклама."] },
        { title: "Получатели и международни трансфери", paragraphs: [
          "Google Firebase предоставя анонимно удостоверяване и доставка на известия. Старото приложение споделяше взаимодействия при преглед и с Google App Indexing. Apple и Google разпространяват приложението. Текущият сайт и текущите версии от изходния код на придружаващото приложение зареждат публичните Minecraft аватари през Cookie Build с публичния UUID; mc-heads.net не получава IP адреса на заявяващото устройство или името на играча. Стара версия може още да зарежда аватарите директно и да разкрива тези данни, докато е налична в някой канал на магазина. Доставчици на инфраструктура в ЕС хостват сайта, API, базата данни, наблюдението и Minecraft сървъра. Те обработват само необходимите за услугите им данни според своите условия и гаранции за защита. Firebase или магазините могат да обработват данни извън ЕИП чрез приложими механизми, например решения за адекватност или стандартни договорни клаузи.",
          "Stripe предоставя хостван Checkout, фактуриране, фактури, възстановявания, спорове и клиентски портал. За платежните данни важи собствената ѝ информация за поверителност; обработване извън ЕИП е възможно с приложимите ѝ гаранции за трансфер. Cookie Build изпраща Minecraft UUID и име, както и препратките към поръчки и продукти, необходими за обработване и съгласуване на трансакцията.",
        ] },
        { title: "Срокове за съхранение", items: [
          "Еднократните кодове за свързване изтичат след 10 минути; одитните записи за заявката се изтриват след 7 дни.",
          "Активният мобилен профил, връзките с играчи и данните за известия се пазят докато са необходими за приложението или до изтриване на мобилния профил.",
          "Приятелствата, блокиранията и активните групи са сървърни записи към Minecraft UUID. Остават до премахването им в приложението или играта, края на групата или приложимия публикуван срок за почистване.",
          "Датата на поканата за приятелство предотвратява повторен контакт за 30 дни след отмяна или отказ; изтрива се след 90 дни.",
          "Оттеглените устройства се премахват след 30 дни; оттеглените връзки с играчи — след 12 месеца.",
          "Отказаните или изтекли заявки и покани и записите за приключили групи се изтриват след 90 дни.",
          "Сигналите се пазят до 24 месеца или по-дълго, докато има отворен случай за безопасност или законово задължение.",
          "Доставените задачи за известяване се премахват след 90 дни, а маркерите за изтрити профили — след 30 дни.",
          "Резултатите и обобщените игрови статистики се пазят за срока на съществуване на сървъра за публични класации, честна игра и целостта на мачовете, освен ако законът изисква по-ранно изтриване.",
          "Дневните и седмичните цели, постиженията, XP, монетите и ограничителят на рекламата на приложението са Minecraft игрови записи и следват срока на игровата статистика.",
          "Достъпът чрез уеб търговска сесия е валиден до 30 дни и може да бъде оттеглен по-рано от играча. Изтичането не изтрива свързаните трансакции.",
          "Поръчки, платежни състояния, възстановявания, спорове, фактури и доказателства за съгласие може да се пазят за счетоводни, данъчни, потребителски задължения и правни претенции. Свържете се с поддръжката за преглед или изтриване на търговските записи. Исканията се разглеждат индивидуално според приложимите срокове за съхранение.",
          "Напредъкът на остров Skyblock, складът, пазарните трансакции и депозитите за възстановяване след прекъсване са игрови записи и записи за целостта и следват срока на Minecraft статистиката.",
        ] },
        { title: "Вашият избор и права", paragraphs: [
          "Състоянието, новините, събитията и класациите са достъпни без свързан играч. В настройките можете да изключите известията, да отделите играч, да копирате данните си и да изтриете мобилния профил. Изтриването премахва псевдонимния мобилен профил, устройствата, предпочитанията, онлайн известията за приятели и мобилните връзки. То не изтрива Minecraft името, приятелствата, блокиранията, груповите или защитните записи към играча и записите за целостта на публичната игрова история. Не изтрива и данните за ранг, XP, монети, постижения, дневни и седмични цели, остров, склад, пазар и депозити Skyblock: това са игрови данни със собствени контроли и срокове, описани по-горе.",
          "Според местоположението си можете да поискате достъп, корекция, изтриване, ограничаване, преносимост или да възразите и да оттеглите съгласие. Пишете на посочения адрес. Можете да подадете жалба и до местния орган за защита на данните; във Франция това е CNIL. Изтриване без приложението е достъпно на страницата за изтриване на профил.",
          "Изтриването на мобилния профил не изтрива отделната търговска история, свързана с Minecraft. Искане за поверителност може да я обхване при спазване на задължителното съхранение за фактури, счетоводство, предотвратяване на измами и правни претенции.",
        ], link: { path: "/account/delete", label: "Страница за изтриване на профил" } },
        { title: "Възраст и промени", paragraphs: ["Придружаващото приложение е предназначено за играчи на 13 или повече години. Играч под възрастта за съгласие за онлайн услуги в своята държава трябва да използва Cookie Build само с родител или настойник. Съществените промени ще бъдат публикувани тук с нова дата на влизане в сила."] },
        { title: "Незадължителен анализ на сайта", paragraphs: ["С Ваше разрешение Google Analytics използва бисквитки за измерване на посещения на публични страници, общи категории на източника на посетителите, кликвания към играта или Discord и стъпки в магазина като избор на получател и започване на плащане. Събитията ни съдържат само предварително зададени категории страници и действия, езика на сайта, общи категории на източника, продуктови идентификатори и издание Java или Bedrock, без Minecraft имена, идентификатори на играчи, кодове за вход, платежни URL адреси, имейли, URL параметри или пълни адреси на препращащи страници. Google Analytics не се зарежда преди разрешението. Можете да откажете или оттеглите разрешение от настройките за анализ в долния колонтитул. Изборът се помни до 180 дни. Тези измервания, основани на съгласие, не обхващат всички посещения и покупки. Google получава необходимите технически данни за връзката; отчетите ни не използват рекламни сигнали или идентификатори между сайтове. Животът на аналитичните бисквитки е ограничен до 180 дни. Google може да обработва данни извън ЕИП при приложимите си гаранции за трансфер."] },
      ],
    },
    terms: {
      title: "Условия за ползване", updated: "В сила и последно актуализирани: 5 септември 2026 г.",
      sections: [
        { title: "Оператор и приемане", paragraphs: ["Cookie Build е независимо управляван Minecraft сървър, сайт и придружаващо приложение, предоставяни от {seller}. С използването на услугата приемате тези условия и публикуваните правила на сървъра. За въпроси: support@cookie-build.com. Cookie Build не е свързан с и не е одобрен от Mojang, Microsoft, Apple или Google."] },
        { title: "Достъп и профили", paragraphs: ["Придружаващото приложение е за лица на 13 или повече години. Когато местното право изисква родителско съгласие за онлайн услуга, родител или настойник трябва да одобри използването. Приложението създава псевдонимен профил на устройството и го свързва с Minecraft играч чрез краткотраен код от играта. Защитете достъпа до устройството и Minecraft профила си. Никога не споделяйте код за свързване."] },
        { title: "Допустимо използване", paragraphs: ["Забранено е:"], items: ["измама, използване на бъгове, автоматизиране на злоупотреби, заобикаляне на модерацията или нарушаване на мрежата;", "тормоз, заплахи, представяне за друг, дискриминация или разкриване на друго лице;", "опити за достъп до чужд профил, свързване на друг играч или заобикаляне на защитите;", "съзнателно неверни сигнали или злоупотреба с покани, повиквания към играчи, блокирания и поддръжка;", "копиране, препродажба или подвеждащо представяне на услугите или марката Cookie Build."], after: ["Приятелства, групи и повиквания към играчи използват само предварително зададени действия и Minecraft имена. Повикванията са ограничени и получателите могат да ги изключат. Тази версия няма публични публикации или свободен чат на живо."] },
        { title: "Модерация, спиране и обжалване", paragraphs: ["Cookie Build може да премахне съдържание, ограничи функция, спре играч или прекрати достъп, когато това е разумно необходимо за безопасност, честна игра, цялост на услугата, спазване на закона или при съществено нарушение на условията. Тежки или повторни злоупотреби могат да доведат до незабавни мерки. За оспорване изпратете на поддръжката Minecraft име, издание, приблизителна дата и релевантен контекст. Жалбите се разглеждат от човек."] },
        { title: "Наличност и промени", paragraphs: ["Игри, карти, статистики, приятели, групи, събития и известия могат да се променят или временно да са недостъпни поради поддръжка, сигурност, софтуерна съвместимост или прекъсвания при трети лица. Функции с липсващи карти остават недостъпни, вместо да се предлагат повредени. Условията може да се актуализират по правни, защитни или продуктови причини. Съществените промени се публикуват с нова дата на влизане в сила, преди да се прилагат, когато това е задължително."] },
        { title: "Покупки и собственост", paragraphs: ["Приложението има магазин за комплекти и Skyblock пазар между играчи, използващи виртуални монети, спечелени чрез игра в Cookie Build. Продажбите обменят само допустими игрови Skyblock ресурси срещу тези монети. В приложението няма плащания с реални пари, абонаменти, платени цифрови права или обмен на виртуални монети за пари. Кодът, графиките и марката Cookie Build принадлежат на съответните носители на права. Minecraft имената, марките и игровите ресурси принадлежат на Mojang или Microsoft и се използват по приложимите им правила. Запазвате правата върху собственото си съдържание и предоставяте на Cookie Build само необходимите за услугата права."] },
        { title: "Уеб покупки, абонаменти и доброволна подкрепа", items: ["Съдържанието, срокът и крайната цена в EUR с данъци са публични в каталога преди вход. Плащането се хоства от Stripe след свързване на получаващия Minecraft играч от купувача.", "Постоянните продукти се доставят цифрово след потвърдено плащане. Преди поръчка купувачът трябва отделно и изрично да поиска незабавно изпълнение и да приеме загубата на правото на отказ при предоставяне на достъпа; никое поле не е предварително отметнато.", "Месечният абонамент Supporter се подновява всеки месец. Може да бъде прекратен от Stripe портала, обикновено в края на периода. При първоначално абониране 14-дневното право на отказ в историята на покупките позволява незабавно прекратяване и пълно възстановяване.", "Възстановявания, спорове, неуспешни плащания, прекратяване, отнемане и изтичане могат да спрат или премахнат само достъпа, финансиран от засегнатото плащане. Никоя покупка не дава състезателно предимство в миниигрите.", "Доброволната подкрепа е повторяем бакшиш за услугата, не благотворително набиране на средства, и не дава ранг, козметика, предмет или изключително предимство.", "Придружаващото мобилно приложение няма търговия с реални пари, Checkout или външна връзка за плащане. Магазинът за комплекти използва само спечелени в играта монети."], after: ["Купувачът може да изтегли трайна история на поръчките, текста на съгласията и времевите им отметки от уеб профила. За плащане, прекратяване, отказ или възстановяване пишете на {support} с номера на поръчката, никога с картови данни."] },
        { title: "Отговорност и приложимо право", paragraphs: ["Услугата се предоставя с разумна грижа, но без гаранция за непрекъсната наличност или пълна точност. Доколкото законът позволява, Cookie Build не носи отговорност за косвени загуби, изгубен виртуален напредък поради документирано прекъсване или откази на платформи на трети лица. Условията не ограничават задължителните потребителски права или отговорност, която законно не може да бъде изключена. Прилага се френското право, без да отнема задължителната защита в държавата на потребителя. Страните първо следва да опитат разрешаване чрез поддръжката; компетентните съдилища и задължителните потребителски права остават достъпни."] },
        { title: "Прекратяване на използването", paragraphs: ["Можете да спрете по всяко време, да отделите Minecraft самоличности, да прекратите приятелства или напуснете групи, да изключите известията и да изтриете мобилния профил в настройките. Обработването на данни след изтриване е описано в Политиката за поверителност."], link: { path: "/privacy", label: "Политика за поверителност" } },
      ],
    },
  },
  hi: {
    sellerUnavailable: "Cookie Build; फ़िलहाल खरीदारी उपलब्ध नहीं है",
    businessId: "व्यवसाय पहचान संख्या", vat: "वैट", mediator: "उपभोक्ता मध्यस्थ",
    privacy: {
      title: "गोपनीयता नीति", updated: "प्रभावी और अंतिम अद्यतन: 5 सितंबर 2026",
      sections: [
        { title: "डेटा नियंत्रक और दायरा", paragraphs: ["Cookie Build का संचालन Guillaume Claverie करते हैं। वे Cookie Build के Minecraft सर्वर, वेबसाइट और साथी ऐप द्वारा संसाधित व्यक्तिगत डेटा के नियंत्रक हैं। गोपनीयता संबंधी प्रश्नों या अनुरोधों के लिए support@cookie-build.com पर लिखें। यह नीति ऐप, वेबसाइट और गेम सेवाओं पर लागू होती है।"] },
        { title: "हम कौन-सा डेटा संसाधित करते हैं", items: [
          "अनाम प्रमाणीकरण से बना एक छद्मनामयुक्त Firebase पहचानकर्ता।",
          "Firebase द्वारा अपने-आप संसाधित प्रमाणीकरण के तकनीकी निदान, जैसे IP पता, ऑपरेटिंग सिस्टम, डिवाइस मॉडल, ब्रांड, डिवाइस का प्रकार, इंस्टॉलर, SDK संस्करण और Firebase ऐप पहचानकर्ता।",
          "Minecraft UUID, सार्वजनिक नाम, Java या Bedrock संस्करण, लिंक की स्थिति और गेम के आँकड़े।",
          "व्यक्तिगत सीज़न रैंक, हर गेम का मैच इतिहास और गतिविधि, मिनी-गेम का कुल XP, उपलब्धियाँ, अर्जित सिक्कों का शेष, अनलॉक और चुनी गई किट तथा दैनिक और साप्ताहिक लक्ष्यों की प्रगति। लक्ष्य UTC के अनुसार रीसेट होते हैं।",
          "Skyblock द्वीप की सदस्यता और भूमिका, प्रगति, खोज-कार्य, कर्मचारी, आभासी भंडार की मात्रा, बाज़ार के भाव, लिस्टिंग और बिक्री, तथा रुकावट से सुरक्षित इन्वेंटरी जमा की स्थिति और समय।",
          "निर्धारित प्रारूप वाले मित्र अनुरोध, स्वीकृत मित्रता, ब्लॉक, रिपोर्ट का कारण, समूह, सदस्य, आमंत्रण और खिलाड़ियों को बुलाने के संदेश। ऐप में स्वतंत्र पाठ वाला चैट नहीं है।",
          "पिछले 30 दिनों में साथ खेले गए पूरे मैचों से माँग पर तैयार मित्र सुझाव। सुझाव मैच, समय, स्कोर, ऑनलाइन स्थिति या अंतिम बार दिखने का समय नहीं बताते और मौजूदा संबंधों, ब्लॉक तथा रिपोर्ट को बाहर रखते हैं।",
          "सक्रिय गेम सत्रों से पता चलने वाली उपस्थिति। यह केवल स्वीकृत मित्रों और वर्तमान समूह के सदस्यों को दिखती है, खिलाड़ी की मित्र और समूह, केवल मित्र या छिपा हुआ सेटिंग तथा सभी ब्लॉक के अनुसार।",
          "सूचनाओं के लिए सहमति देने पर: इंस्टॉलेशन पहचानकर्ता, FCM टोकन, प्लेटफ़ॉर्म, ऐप संस्करण, भाषा, अनुमति की स्थिति, शांत समय, दैनिक और साप्ताहिक रिमाइंडर की पसंद और किसी चुने हुए स्वीकृत मित्र के ऑनलाइन आने का वैकल्पिक अलर्ट। Cookie Build मनमाने खिलाड़ियों का चुपचाप पीछा करने की सुविधा नहीं देता।",
          "गेम में ऐप रिमाइंडर का सीमित काउंटर और आखिरी बार दिखाने की तारीख, ताकि लिंक न किए हुए खिलाड़ी को बार-बार ऐप का प्रचार न दिखे।",
          "जब तक पुराने Android डिवाइसों के लिए पुराना संस्करण 1.2.3 उपलब्ध है: Minecraft नाम, Google Play उत्पाद और खरीद इतिहास, खरीद टोकन और हस्ताक्षर, तथा पुराने स्टोर और Google App Indexing में इस्तेमाल हुई ऐप देखने की गतिविधियाँ।",
          "अल्पकालिक सुरक्षा जानकारी, जैसे IP-आधारित अनुरोध सीमा के काउंटर और परिचालन लॉग।",
          "वेब खरीदारी के लिए: सत्र में इस्तेमाल खिलाड़ी का Minecraft UUID और नाम, सत्र टोकन का हैश, ऑर्डर और उत्पाद के संदर्भ, कुल मूल्य और मुद्रा, Stripe ग्राहक, Checkout, सदस्यता, भुगतान, चालान, चार्ज, रिफ़ंड और विवाद के पहचानकर्ता और स्थितियाँ, पहुँच के अधिकार का स्रोत, खरीद इतिहास और शर्तों, तत्काल निष्पादन, खरीद से पीछे हटने के अधिकार के त्याग, सदस्यता रद्द करने और खरीद से पीछे हटने की कार्रवाइयों के सटीक संस्करण और समय।",
        ], after: ["वर्तमान ऐप विज्ञापन पहचानकर्ता, ऐपों के बीच ट्रैकिंग, Firebase Analytics, Crashlytics, सटीक स्थान, संपर्क, माइक्रोफ़ोन, कैमरा या भुगतान डेटा का इस्तेमाल नहीं करता। पुराने संस्करण 1.2.3 में स्टोर अनुरोध बिना एन्क्रिप्शन भेजे जाते थे; अपडेट समर्थित डिवाइसों पर इसे बदल देता है। यह कथन केवल मोबाइल ऐप के लिए है। वेब भुगतान Stripe पर होते हैं; Stripe संपर्क, बिलिंग और कार्ड या भुगतान विवरण संसाधित करता है। Cookie Build पूरे कार्ड नंबर या सुरक्षा कोड प्राप्त या संग्रहित नहीं करता। सार्वजनिक Minecraft नाम और गेम आँकड़े रैंकिंग में दिख सकते हैं।"] },
        { title: "उद्देश्य और कानूनी आधार", items: [
          "अनुबंध: ऐप का प्रमाणीकरण, सही खिलाड़ी को लिंक करना, आँकड़े, इतिहास, रैंक और लक्ष्य देना, Skyblock द्वीप, भंडार और अर्जित सिक्कों वाले बाज़ार का प्रबंधन, उन्हीं सिक्कों से किट अनलॉक और चुनना, गोपनीयता-सीमित उपस्थिति, मित्र और हाल में मिले खिलाड़ियों के सुझाव, समूह, आयोजन और अनुरोधित खाता नियंत्रण देना।",
          "अनुबंध और अनुबंध-पूर्व कदम: खरीदने वाले खिलाड़ी को लिंक करना, वेब ऑर्डर और सदस्यताएँ पूरी करना, खरीद इतिहास दिखाना, रद्द करने की सुविधा और सहायता देना।",
          "कानूनी दायित्व: लागू लेखांकन, कर और उपभोक्ता कानून की अवधि तक लेन-देन और सहमति के प्रमाण रखना।",
          "सहमति: खिलाड़ियों के बुलावे, लक्ष्य रिमाइंडर और चुने हुए स्वीकृत मित्रों के ऑनलाइन अलर्ट सहित अलग-अलग सेट की जा सकने वाली पुश सूचनाएँ केवल ऐप में संबंधित अनुमति के बाद भेजना। सेटिंग्स में सहमति वापस ली जा सकती है। शांत समय में ये सूचनाएँ नहीं भेजी जातीं।",
          "वैध हित: खातों की सुरक्षा, दुरुपयोग रोकना, रिपोर्ट की समीक्षा, निष्पक्ष खेल बनाए रखना, घटनाओं का निदान और सेवा की उपलब्धता सुरक्षित रखना।",
          "वैध हित: Stripe घटनाओं का मिलान, दोहरे या धोखाधड़ी वाले ऑर्डर रोकना, सत्र सुरक्षित रखना, भुगतान विवाद संभालना और कानूनी दावों के बचाव के लिए न्यूनतम ज़रूरी प्रमाण रखना।",
        ], after: ["Cookie Build व्यक्तिगत डेटा नहीं बेचता और लक्षित विज्ञापन के लिए उसका इस्तेमाल नहीं करता।"] },
        { title: "प्राप्तकर्ता और अंतरराष्ट्रीय हस्तांतरण", paragraphs: [
          "Google Firebase अनाम प्रमाणीकरण और पुश सूचनाएँ प्रदान करता है। पुराने ऐप में देखने की गतिविधियाँ Google App Indexing के साथ भी साझा होती थीं। Apple और Google ऐप वितरित करते हैं। वर्तमान वेबसाइट और साथी ऐप के मौजूदा सोर्स बिल्ड सार्वजनिक Minecraft UUID से Cookie Build प्रॉक्सी के ज़रिए अवतार लोड करते हैं; इसलिए mc-heads.net को अनुरोध करने वाले डिवाइस का IP पता या खिलाड़ी का नाम नहीं मिलता। पुराना बिल्ड किसी स्टोर चैनल में उपलब्ध रहने तक अवतार सीधे लोड करके ये जानकारी भेज सकता है। यूरोपीय संघ के इंफ़्रास्ट्रक्चर प्रदाता वेबसाइट, API, डेटाबेस, निगरानी और Minecraft सर्वर होस्ट करते हैं। वे अपनी शर्तों और डेटा सुरक्षा उपायों के तहत केवल सेवा के लिए ज़रूरी डेटा संसाधित करते हैं। Firebase या स्टोर सेवाएँ पर्याप्तता निर्णय या मानक संविदात्मक धाराओं जैसे लागू तंत्र के साथ यूरोपीय आर्थिक क्षेत्र (EEE) के बाहर डेटा संसाधित कर सकती हैं।",
          "Stripe होस्ट किया हुआ Checkout, बिलिंग, चालान, रिफ़ंड, विवाद प्रबंधन और ग्राहक पोर्टल देता है। भुगतान डेटा पर उसकी अपनी गोपनीयता जानकारी लागू होती है और वह लागू हस्तांतरण सुरक्षा उपायों के साथ EEE के बाहर डेटा संसाधित कर सकता है। Cookie Build उसे खिलाड़ी का Minecraft UUID और नाम तथा लेन-देन को संसाधित करने और मिलाने के लिए ज़रूरी ऑर्डर और उत्पाद संदर्भ भेजता है।",
        ] },
        { title: "डेटा रखने की अवधि", items: [
          "एक बार इस्तेमाल होने वाले लिंक कोड 10 मिनट बाद समाप्त होते हैं; अनुरोध के ऑडिट रिकॉर्ड 7 दिन बाद हटते हैं।",
          "सक्रिय मोबाइल प्रोफ़ाइल, खिलाड़ी लिंक और सूचना डेटा ऐप देने के लिए ज़रूरी रहने तक या मोबाइल खाता हटाने तक रखे जाते हैं।",
          "मित्रता, ब्लॉक और सक्रिय समूह Minecraft UUID से जुड़े सर्वर रिकॉर्ड हैं। वे ऐप या गेम से हटाने, समूह समाप्त होने या प्रकाशित सफ़ाई अवधि लागू होने तक रहते हैं।",
          "मित्र अनुरोध का समय रद्द या अस्वीकार होने के बाद 30 दिन तक दोबारा संपर्क रोकता है; समय का रिकॉर्ड 90 दिन बाद हटता है।",
          "वापस ली गई अनुमति वाले डिवाइस 30 दिन बाद और हटाए गए खिलाड़ी लिंक 12 महीने बाद मिटाए जाते हैं।",
          "अस्वीकृत या समाप्त अनुरोध, आमंत्रण और समाप्त समूहों के रिकॉर्ड 90 दिन बाद हटते हैं।",
          "रिपोर्ट अधिकतम 24 महीने रखी जाती हैं, या सुरक्षा मामला अथवा कानूनी दायित्व खुला रहने तक अधिक समय के लिए।",
          "पहुँचाई गई सूचनाओं के कार्य 90 दिन बाद और हटाए गए खातों के चिह्न 30 दिन बाद मिटते हैं।",
          "मैच परिणाम और कुल गेम आँकड़े सार्वजनिक रैंकिंग, निष्पक्षता और मैच की अखंडता के लिए सर्वर के जीवनकाल तक रहते हैं, जब तक कानून पहले हटाना अनिवार्य न करे।",
          "दैनिक और साप्ताहिक लक्ष्य, उपलब्धियाँ, XP, सिक्के और ऐप प्रचार की सीमा Minecraft गेम रिकॉर्ड हैं और गेम आँकड़ों की अवधि का पालन करते हैं।",
          "वेब खरीदारी सत्र अधिकतम 30 दिन वैध रहता है और खिलाड़ी इसे पहले रद्द कर सकता है। समाप्ति संबंधित लेन-देन नहीं मिटाती।",
          "ऑर्डर, भुगतान स्थिति, रिफ़ंड, विवाद, चालान और सहमति प्रमाण लेखांकन, कर, उपभोक्ता संरक्षण और कानूनी दावों के लिए रखना आवश्यक हो सकता है। खरीदारी रिकॉर्ड की समीक्षा या हटाने के लिए सहायता से संपर्क करें। लागू संरक्षण दायित्वों के अनुसार प्रत्येक अनुरोध की अलग समीक्षा होती है।",
          "Skyblock द्वीप प्रगति, भंडार, बाज़ार लेन-देन और रुकावट के बाद बहाली वाले जमा गेम और अखंडता रिकॉर्ड हैं और Minecraft आँकड़ों की अवधि का पालन करते हैं।",
        ] },
        { title: "आपके विकल्प और अधिकार", paragraphs: [
          "बिना खिलाड़ी लिंक किए भी स्थिति, समाचार, आयोजन और रैंकिंग उपलब्ध हैं। सेटिंग्स में सूचनाएँ बंद कर सकते हैं, खिलाड़ी का लिंक हटा सकते हैं, ऐप खाते का डेटा कॉपी कर सकते हैं और मोबाइल खाता हटा सकते हैं। हटाने से छद्मनामयुक्त मोबाइल प्रोफ़ाइल, डिवाइस, पसंद, मित्र-विशेष ऑनलाइन अलर्ट और मोबाइल लिंक मिटते हैं। इससे Minecraft नाम, मित्रता, ब्लॉक, समूह या खिलाड़ी से जुड़े सुरक्षा रिकॉर्ड और सार्वजनिक गेम इतिहास के अखंडता रिकॉर्ड नहीं मिटते। रैंक के आधार, XP, सिक्के, उपलब्धियाँ, दैनिक और साप्ताहिक लक्ष्य, Skyblock द्वीप, भंडार, बाज़ार या जमा भी नहीं मिटते: ये मोबाइल खाते के बजाय गेम के रिकॉर्ड हैं, जिनके अपने नियंत्रण और ऊपर दिए गए संरक्षण समय हैं।",
          "स्थान के अनुसार आप पहुँच, सुधार, हटाने, सीमित करने, पोर्टेबिलिटी या आपत्ति का अनुरोध कर सकते हैं और सहमति वापस ले सकते हैं। ऊपर दिए पते पर संपर्क करें। स्थानीय डेटा संरक्षण प्राधिकरण में शिकायत भी कर सकते हैं; फ़्रांस में यह CNIL है। ऐप के बिना खाता हटाने के लिए खाता हटाने का पृष्ठ उपलब्ध है।",
          "मोबाइल खाता हटाने से Minecraft से जुड़ा अलग खरीदारी इतिहास नहीं मिटता। गोपनीयता अनुरोध में उसे शामिल किया जा सकता है, लेकिन चालान, लेखांकन, धोखाधड़ी रोकने और कानूनी दावों के लिए अनिवार्य संरक्षण लागू रहता है।",
        ], link: { path: "/account/delete", label: "खाता हटाने का पृष्ठ" } },
        { title: "आयु और बदलाव", paragraphs: ["साथी ऐप 13 वर्ष या उससे अधिक आयु के खिलाड़ियों के लिए है। अपने देश में ऑनलाइन सेवाओं की सहमति की आयु से छोटे खिलाड़ी को केवल माता-पिता या अभिभावक के साथ Cookie Build इस्तेमाल करना चाहिए। महत्वपूर्ण नीति बदलाव यहाँ प्रकाशित किए जाएँगे और प्रभावी तारीख अपडेट होगी।"] },
        { title: "वैकल्पिक वेबसाइट विश्लेषण", paragraphs: ["आपकी अनुमति से Google Analytics कुकी का उपयोग सार्वजनिक पृष्ठों की यात्राएँ, आगंतुक स्रोत की व्यापक श्रेणियाँ, गेम या Discord की ओर क्लिक और प्राप्तकर्ता चुनने या भुगतान शुरू करने जैसे स्टोर चरण मापने के लिए करता है। हमारे इवेंट में केवल पहले से तय पृष्ठ श्रेणियाँ और क्रियाएँ, साइट की भाषा, स्रोत की व्यापक श्रेणियाँ, उत्पाद पहचानकर्ता और Java या Bedrock संस्करण शामिल होते हैं; Minecraft नाम, खिलाड़ी पहचानकर्ता, लॉगिन कोड, भुगतान URL, ईमेल पते, URL पैरामीटर या पूरे रेफ़रल URL नहीं। अनुमति से पहले कोई Google Analytics टैग लोड नहीं होता। पादलेख की विश्लेषण प्राथमिकताओं से अनुमति अस्वीकार या वापस ले सकते हैं। आपकी पसंद अधिकतम 180 दिन याद रखी जाती है। सहमति-आधारित मापन हर यात्रा या खरीद का प्रतिनिधित्व नहीं करता। सेवा के लिए Google को तकनीकी कनेक्शन डेटा मिलता है; हमारी रिपोर्टिंग विज्ञापन संकेत या साइटों के बीच उपयोगकर्ता पहचानकर्ता इस्तेमाल नहीं करती। विश्लेषण कुकी की अवधि 180 दिन तक सीमित है। Google लागू हस्तांतरण सुरक्षा उपायों के तहत EEE के बाहर डेटा संसाधित कर सकता है।"] },
      ],
    },
    terms: {
      title: "सेवा की शर्तें", updated: "प्रभावी और अंतिम अद्यतन: 5 सितंबर 2026",
      sections: [
        { title: "संचालक और स्वीकृति", paragraphs: ["Cookie Build स्वतंत्र रूप से चलने वाला Minecraft सर्वर, वेबसाइट और साथी ऐप है, जिसे {seller} प्रदान करता है। सेवा इस्तेमाल करके आप इन शर्तों और सर्वर के प्रकाशित नियमों को स्वीकार करते हैं। प्रश्नों के लिए support@cookie-build.com पर लिखें। Cookie Build Mojang, Microsoft, Apple या Google से संबद्ध या उनके द्वारा समर्थित नहीं है।"] },
        { title: "पात्रता और खाते", paragraphs: ["साथी ऐप 13 वर्ष या उससे अधिक आयु के लोगों के लिए है। जहाँ स्थानीय कानून ऑनलाइन सेवा के लिए माता-पिता की सहमति माँगता है, वहाँ माता-पिता या अभिभावक की अनुमति आवश्यक है। ऐप डिवाइस का छद्मनामयुक्त खाता बनाता है और गेम में बने थोड़े समय के कोड से उसे Minecraft खिलाड़ी से लिंक कर सकता है। डिवाइस और Minecraft खाते की पहुँच सुरक्षित रखें। लिंक कोड कभी साझा न करें।"] },
        { title: "स्वीकार्य उपयोग", paragraphs: ["आपको यह नहीं करना चाहिए:"], items: ["चीट करना, बग का लाभ उठाना, दुरुपयोग को स्वचालित करना, मॉडरेशन से बचना या नेटवर्क बाधित करना;", "उत्पीड़न, धमकी, किसी और का रूप लेना, भेदभाव या दूसरे व्यक्ति को उजागर करना;", "दूसरे खाते तक पहुँचने, दूसरे खिलाड़ी को लिंक करने या सुरक्षा नियंत्रण से बचने की कोशिश;", "जानबूझकर झूठी रिपोर्ट देना या आमंत्रण, खिलाड़ी बुलावे, ब्लॉक या सहायता माध्यम का दुरुपयोग;", "Cookie Build सेवाओं या ब्रांड की नकल, पुनर्विक्रय या भ्रामक प्रस्तुति।"], after: ["मित्र, समूह और खिलाड़ी बुलावे केवल पहले से तय क्रियाएँ और Minecraft नाम इस्तेमाल करते हैं। बुलावे की दर सीमित है और प्राप्तकर्ता उन्हें बंद कर सकते हैं। इस ऐप संस्करण में सार्वजनिक पोस्ट या स्वतंत्र लाइव चैट नहीं है।"] },
        { title: "मॉडरेशन, निलंबन और अपील", paragraphs: ["सुरक्षा, निष्पक्ष खेल, सेवा की अखंडता, कानून का पालन या इन शर्तों के गंभीर उल्लंघन के लिए उचित रूप से आवश्यक होने पर Cookie Build सामग्री हटा सकता है, सुविधा सीमित कर सकता है, खिलाड़ी निलंबित कर सकता है या पहुँच समाप्त कर सकता है। गंभीर या बार-बार दुरुपयोग पर तत्काल कार्रवाई हो सकती है। निर्णय को चुनौती देने के लिए Minecraft नाम, संस्करण, लगभग तारीख और संबंधित संदर्भ सहायता को ईमेल करें। अपील की समीक्षा कोई व्यक्ति करता है।"] },
        { title: "उपलब्धता और बदलाव", paragraphs: ["गेम, नक्शे, आँकड़े, मित्र, समूह, आयोजन और सूचनाएँ बदल सकते हैं या रखरखाव, सुरक्षा, सॉफ़्टवेयर संगतता या तीसरे पक्ष की खराबी के कारण अस्थायी रूप से अनुपलब्ध हो सकते हैं। गायब नक्शों पर निर्भर सुविधाएँ खराब अवस्था में देने के बजाय बंद रखी जाती हैं। कानूनी, सुरक्षा या उत्पाद बदलावों के लिए ये शर्तें अपडेट हो सकती हैं। जहाँ आवश्यक हो, महत्वपूर्ण बदलाव लागू होने से पहले नई प्रभावी तारीख के साथ प्रकाशित होंगे।"] },
        { title: "खरीदारी और स्वामित्व", paragraphs: ["ऐप में किट स्टोर और खिलाड़ियों के बीच Skyblock बाज़ार है, जो Cookie Build खेलकर अर्जित आभासी सिक्के इस्तेमाल करते हैं। बाज़ार में केवल योग्य Skyblock गेम संसाधन इन सिक्कों के बदले बेचे जाते हैं। ऐप में वास्तविक पैसे का भुगतान, सदस्यता, भुगतान वाला डिजिटल अधिकार या आभासी सिक्कों को पैसे में बदलना नहीं है। Cookie Build का कोड, कलाकृति और ब्रांड संबंधित स्वामियों के हैं। Minecraft नाम, चिह्न और गेम सामग्री Mojang या Microsoft की हैं और लागू उपयोग दिशानिर्देशों के अनुसार इस्तेमाल होती हैं। अपनी सामग्री के अधिकार आपके पास रहते हैं और आप Cookie Build को केवल सेवा चलाने के लिए आवश्यक अधिकार देते हैं।"] },
        { title: "वेब खरीदारी, सदस्यताएँ और स्वैच्छिक सहायता", items: ["उत्पाद की सामग्री, अवधि और कर सहित कुल EUR मूल्य लॉगिन से पहले कैटलॉग में सार्वजनिक हैं। खरीदार के प्राप्तकर्ता Minecraft खिलाड़ी को लिंक करने के बाद भुगतान Stripe पर होता है।", "स्थायी उत्पाद पुष्ट भुगतान के बाद डिजिटल रूप से दिए जाते हैं। ऑर्डर से पहले खरीदार को अलग-अलग और स्पष्ट रूप से तत्काल निष्पादन माँगना तथा पहुँच मिलने पर खरीद से पीछे हटने का अधिकार खोना स्वीकार करना होता है; कोई बॉक्स पहले से चुना नहीं होता।", "Supporter की मासिक सदस्यता हर महीने नवीनीकृत होती है। इसे Stripe पोर्टल से सामान्यतः अवधि के अंत में रद्द किया जा सकता है। शुरुआती सदस्यता के 14 दिनों में खरीद इतिहास का वापसी विकल्प तत्काल रद्द करने और पूरा रिफ़ंड देता है।", "रिफ़ंड, विवाद, विफल भुगतान, रद्द करना, अधिकार वापस लेना या समाप्ति केवल संबंधित भुगतान से वित्तपोषित पहुँच रोक या हटा सकते हैं। कोई खरीद प्रतिस्पर्धी मिनी-गेम में लाभ नहीं देती।", "स्वैच्छिक सहायता सेवा को बार-बार दी जा सकने वाली टिप है, धर्मार्थ चंदा नहीं; इससे रैंक, कॉस्मेटिक, वस्तु या विशेष लाभ नहीं मिलता।", "मोबाइल साथी ऐप में वास्तविक पैसे की खरीदारी, Checkout या बाहरी भुगतान लिंक नहीं है। उसका किट स्टोर केवल खेलकर अर्जित सिक्के इस्तेमाल करता है।"], after: ["खरीदार वेब खाते से स्थायी रूप में ऑर्डर इतिहास, सहमति का पाठ और समय डाउनलोड कर सकता है। भुगतान, रद्द करने, खरीद से पीछे हटने या रिफ़ंड की सहायता के लिए ऑर्डर संदर्भ के साथ {support} पर लिखें, कभी कार्ड विवरण न भेजें।"] },
        { title: "दायित्व और लागू कानून", paragraphs: ["सेवा उचित सावधानी से दी जाती है, लेकिन लगातार उपलब्धता और पूर्ण सटीकता की गारंटी नहीं है। कानून की अनुमति तक, Cookie Build अप्रत्यक्ष हानि, दर्ज सेवा रुकावट से खोई आभासी प्रगति या तीसरे पक्ष के प्लेटफ़ॉर्म की खराबी के लिए उत्तरदायी नहीं है। ये शर्तें अनिवार्य उपभोक्ता अधिकारों या कानूनी रूप से बाहर न किए जा सकने वाले दायित्व को सीमित नहीं करतीं। फ़्रांसीसी कानून लागू होता है, लेकिन उपभोक्ता के देश की अनिवार्य सुरक्षा नहीं छीनता। पक्षों को पहले सहायता के माध्यम से विवाद सुलझाने का प्रयास करना चाहिए; सक्षम न्यायालय और अनिवार्य उपभोक्ता अधिकार उपलब्ध रहते हैं।"] },
        { title: "उपयोग बंद करना", paragraphs: ["आप किसी भी समय उपयोग बंद कर सकते हैं, Minecraft पहचान का लिंक हटा सकते हैं, मित्रता या समूह छोड़ सकते हैं, सूचनाएँ बंद कर सकते हैं और सेटिंग्स में मोबाइल खाता हटा सकते हैं। हटाने के बाद डेटा का प्रबंधन गोपनीयता नीति में बताया गया है।"], link: { path: "/privacy", label: "गोपनीयता नीति" } },
      ],
    },
  },
  it: {
  "sellerUnavailable": "Cookie Build; gli acquisti non sono attualmente disponibili",
  "businessId": "Numero di registrazione dell’impresa",
  "vat": "Partita IVA",
  "mediator": "Mediatore dei consumatori",
  "privacy": {
    "title": "Informativa sulla privacy",
    "updated": "In vigore e ultimo aggiornamento: 5 settembre 2026",
    "sections": [
      {
        "title": "Titolare del trattamento e ambito",
        "paragraphs": [
          "Cookie Build è gestito da Guillaume Claverie, responsabile dei dati personali trattati dal server Minecraft, dal sito e dall’app complementare Cookie Build. Per domande e richieste sulla privacy, scrivi a support@cookie-build.com. Questa informativa riguarda l’app, il sito e i servizi di gioco."
        ]
      },
      {
        "title": "Dati trattati",
        "items": [
          "Un identificatore Firebase pseudonimo creato tramite autenticazione anonima.",
          "Dati diagnostici tecnici di autenticazione trattati automaticamente da Firebase, come indirizzo IP, sistema operativo, modello, marca e formato del dispositivo, programma di installazione, versioni SDK e identificatore dell’app Firebase.",
          "UUID Minecraft, nome visualizzato, edizione Java o Bedrock, stato del collegamento e statistiche di gioco.",
          "Rango stagionale personale, cronologia delle partite e attività per gioco, XP totali dei mini-giochi, traguardi, monete guadagnate, kit sbloccati e selezionati e progressi negli obiettivi giornalieri e settimanali. Gli obiettivi si azzerano secondo l’ora UTC.",
          "Appartenenza e ruolo nelle isole Skyblock, progressi, missioni, lavoratori, quantità nel magazzino virtuale, quotazioni, inserzioni e vendite del mercato, stato e orari dei depositi di inventario recuperabili in caso di arresto anomalo.",
          "Richieste di amicizia strutturate, amicizie confermate, blocchi, motivi delle segnalazioni, gruppi, membri, inviti e richiami ai giocatori in formato prestabilito. L’app non include una chat a testo libero.",
          "Suggerimenti di amicizia calcolati su richiesta dalle partite completate insieme negli ultimi 30 giorni. Non rivelano la partita, l’orario, il risultato, lo stato online o l’ultima attività ed escludono relazioni già esistenti, blocchi e segnalazioni.",
          "Presenza ricavata dalle sessioni di gioco attive, visibile soltanto agli amici confermati e ai membri del gruppo attuale, secondo l’impostazione amici e gruppo, solo amici o nascosta, e nel rispetto dei blocchi.",
          "Se attivi le notifiche: identificatore dell’installazione, token FCM, piattaforma, versione dell’app, lingua, stato dell’autorizzazione, orari di silenzio, promemoria giornalieri e settimanali e, facoltativamente, un avviso quando un amico confermato scelto è online. Non è possibile seguire di nascosto giocatori arbitrari.",
          "Un contatore limitato dei promemoria in gioco per l’app e la data dell’ultima visualizzazione, per evitare di riproporre continuamente la promozione dell’app ai giocatori non collegati.",
          "Finché la vecchia versione 1.2.3 resta disponibile sui dispositivi Android meno recenti: nome Minecraft, prodotti Google Play e cronologia degli acquisti, token e firma di acquisto e interazioni di visualizzazione del vecchio negozio e dell’integrazione Google App Indexing.",
          "Informazioni di sicurezza conservate per brevi periodi, come contatori di limitazione delle richieste basati sull’IP e registri operativi.",
          "Per gli acquisti sul sito: UUID e nome Minecraft della sessione commerciale, hash del token di sessione, riferimenti di ordini e prodotti, prezzo totale e valuta, identificatori e stati Stripe di cliente, checkout, abbonamento, pagamento, fattura, addebito, rimborso e contestazione, provenienza dei diritti di accesso, cronologia degli acquisti e versione esatta e orari delle condizioni, dell’esecuzione immediata, della rinuncia al recesso, della disdetta e del recesso."
        ],
        "after": [
          "L’app attuale non utilizza identificatori pubblicitari, tracciamento tra app, Firebase Analytics, Crashlytics, posizione precisa, contatti, microfono, fotocamera o dati di pagamento. La versione 1.2.3 trasmetteva le richieste del negozio senza crittografia; l’aggiornamento sostituisce questa implementazione sui dispositivi compatibili. Questa affermazione riguarda soltanto l’app mobile. I pagamenti web sono ospitati da Stripe, che tratta i dati di contatto, fatturazione, carta o altro metodo di pagamento. Cookie Build non riceve né conserva numeri completi di carta o codici di sicurezza. I nomi Minecraft pubblici e le statistiche di gioco possono comparire nelle classifiche pubbliche."
        ]
      },
      {
        "title": "Finalità e basi giuridiche",
        "items": [
          "Contratto: autenticazione, corretto collegamento del giocatore, statistiche, cronologia, rango, obiettivi, isola e magazzino Skyblock, gestione del mercato con monete guadagnate, sblocco e selezione dei kit, presenza limitata dalle impostazioni di privacy, amici e suggerimenti di giocatori incontrati di recente, gruppi, eventi e funzioni dell’account richieste.",
          "Contratto e misure precontrattuali: collegamento dell’acquirente, esecuzione degli ordini web e degli abbonamenti, cronologia degli acquisti, disdetta e assistenza.",
          "Obblighi legali: conservazione delle prove delle transazioni e dei consensi per i periodi previsti dalle norme contabili, fiscali e di tutela dei consumatori applicabili.",
          "Consenso: notifiche push, inclusi richiami ai giocatori configurabili separatamente, promemoria degli obiettivi e avvisi online per amici confermati scelti, soltanto dopo la rispettiva attivazione nell’app. Il consenso può essere revocato nelle impostazioni. Gli orari di silenzio impediscono l’invio di queste notifiche.",
          "Legittimi interessi: sicurezza degli account, prevenzione degli abusi, gestione delle segnalazioni, correttezza del gioco, diagnosi dei problemi e disponibilità del servizio.",
          "Legittimi interessi: riconciliazione degli eventi Stripe, prevenzione di ordini duplicati o fraudolenti, sicurezza delle sessioni, contestazioni dei pagamenti e conservazione delle prove minime necessarie alla difesa di diritti."
        ],
        "after": [
          "Cookie Build non vende dati personali e non li utilizza per pubblicità mirata."
        ]
      },
      {
        "title": "Destinatari e trasferimenti internazionali",
        "paragraphs": [
          "Google Firebase fornisce autenticazione anonima e invio delle notifiche push. La vecchia app condivideva anche le interazioni di visualizzazione con Google App Indexing. Apple e Google distribuiscono l’app. Il sito attuale e le build attuali del codice sorgente dell’app complementare caricano gli avatar Minecraft pubblici tramite Cookie Build usando l’UUID pubblico; mc-heads.net non riceve quindi l’IP del dispositivo né il nome del giocatore. Le vecchie build dell’app possono ancora caricare direttamente gli avatar e divulgare questi dati finché sono disponibili in un canale dello store. Fornitori nell’UE ospitano sito, API, database, monitoraggio e server Minecraft. Trattano soltanto i dati necessari ai rispettivi servizi, secondo le proprie condizioni e garanzie. I servizi Firebase o degli store possono trattare dati fuori dallo SEE tramite i meccanismi applicabili, come decisioni di adeguatezza o clausole contrattuali standard.",
          "Stripe fornisce checkout ospitato, fatturazione, fatture, rimborsi, gestione delle contestazioni e portale clienti. Tratta i dati di pagamento secondo le proprie informative sulla privacy e può trattarli fuori dallo SEE con le proprie garanzie di trasferimento applicabili. Cookie Build trasmette UUID e nome Minecraft e i riferimenti di ordini e prodotti necessari all’elaborazione e alla riconciliazione."
        ]
      },
      {
        "title": "Conservazione",
        "items": [
          "I codici di collegamento monouso scadono dopo 10 minuti; i registri di verifica delle richieste sono eliminati dopo 7 giorni.",
          "Il profilo mobile attivo, i collegamenti dei giocatori e i dati delle notifiche restano conservati finché servono all’app o fino all’eliminazione dell’account mobile.",
          "Amicizie, blocchi e gruppi attivi sono dati del server associati all’UUID Minecraft. Restano fino alla rimozione nell’app o nel gioco, alla chiusura del gruppo o alla pulizia pubblicata applicabile.",
          "La data di una richiesta di amicizia impedisce nuovi contatti per 30 giorni dopo il ritiro o il rifiuto; viene eliminata dopo 90 giorni.",
          "I dispositivi revocati vengono eliminati dopo 30 giorni e i collegamenti dei giocatori revocati dopo 12 mesi.",
          "Richieste e inviti rifiutati o scaduti e gruppi chiusi vengono eliminati dopo 90 giorni.",
          "Le segnalazioni vengono conservate fino a 24 mesi, più a lungo soltanto per un caso di sicurezza ancora aperto o un obbligo legale.",
          "I lavori di notifica consegnati vengono eliminati dopo 90 giorni e i registri di eliminazione degli account mobili dopo 30 giorni.",
          "Risultati delle partite e statistiche aggregate restano per classifiche pubbliche, correttezza e integrità durante la vita del server, salvo obbligo legale di eliminazione anticipata.",
          "Obiettivi giornalieri e settimanali, traguardi, XP, monete e limiti ai promemoria dell’app sono dati di gioco Minecraft e seguono la conservazione delle statistiche di gioco.",
          "Una sessione commerciale web dura al massimo 30 giorni e può essere revocata prima dal giocatore. La scadenza non elimina le transazioni associate.",
          "Ordini, stati dei pagamenti, rimborsi, contestazioni, fatture e prove dei consensi possono dover essere conservati per contabilità, imposte, tutela dei consumatori e pretese legali. Contatta l’assistenza per una verifica o cancellazione dei dati commerciali. Ogni richiesta viene esaminata individualmente tenendo conto degli obblighi di conservazione applicabili.",
          "Progressi delle isole Skyblock, magazzino, transazioni del mercato e depositi recuperabili dopo un arresto anomalo sono dati di gioco e di integrità e seguono la conservazione delle statistiche Minecraft."
        ]
      },
      {
        "title": "Scelte e diritti",
        "paragraphs": [
          "Puoi usare stato, notizie, eventi e classifiche senza collegare un giocatore. Nelle impostazioni puoi disattivare le notifiche, scollegare un giocatore, copiare i dati dell’account dell’app ed eliminare l’account mobile. Ciò rimuove profilo mobile pseudonimo, dispositivi, preferenze, avvisi online per singoli amici e collegamenti mobili. Non elimina il nome Minecraft, le amicizie, i blocchi, i gruppi e i dati di sicurezza associati a quell’identità, né i dati di integrità della cronologia pubblica delle partite. Anche i dati alla base del rango, XP, monete, traguardi, obiettivi giornalieri e settimanali e dati Skyblock di isola, magazzino, mercato e depositi restano dati di gioco, con i controlli e i periodi propri indicati sopra.",
          "A seconda di dove vivi, puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità o opposizione e revocare il consenso. Usa il contatto indicato sopra. Puoi presentare reclamo all’autorità di protezione dei dati competente; in Francia è la CNIL. Se non puoi usare l’app, è disponibile la pagina di eliminazione dell’account.",
          "L’eliminazione dell’account mobile non elimina la cronologia commerciale separata collegata al giocatore Minecraft. Una richiesta sulla privacy può includerla, fatti salvi gli obblighi di conservazione per fatture, contabilità, prevenzione delle frodi e pretese legali."
        ],
        "link": {
          "path": "/account/delete",
          "label": "Pagina di eliminazione dell’account"
        }
      },
      {
        "title": "Età e modifiche",
        "paragraphs": [
          "L’app complementare è destinata a persone di almeno 13 anni. Se non hai raggiunto l’età richiesta nel tuo paese per acconsentire ai servizi online, usa Cookie Build soltanto con un genitore o tutore. Pubblicheremo qui le modifiche sostanziali con una data di entrata in vigore aggiornata."
        ]
      },
      {
        "title": "Analisi facoltativa del sito",
        "paragraphs": [
          "Con il tuo consenso, Google Analytics usa cookie per misurare visite alle pagine pubbliche, categorie generali di provenienza dei visitatori, clic verso il gioco o Discord e passaggi nel negozio come la scelta del destinatario o l’avvio del pagamento. I nostri eventi contengono soltanto categorie e azioni di pagina predefinite, lingua del sito, categorie generali di provenienza, identificatori di prodotto ed edizione (Java o Bedrock), senza nomi Minecraft, identificatori dei giocatori, codici di accesso, URL di pagamento, indirizzi e-mail, parametri URL o referrer grezzi. Nessun tag Google Analytics viene caricato prima del consenso. Puoi rifiutare o revocare il consenso dalle preferenze di analisi nel piè di pagina. Ricordiamo la scelta fino a 180 giorni. Queste misurazioni basate sul consenso non rappresentano tutte le visite o gli acquisti. Google riceve dati tecnici di connessione per fornire il servizio; i nostri rapporti non usano segnali pubblicitari o identificatori tra siti. La durata dei cookie di analisi è limitata a 180 giorni. Google può trattare dati fuori dallo SEE con le proprie garanzie di trasferimento applicabili."
        ]
      }
    ]
  },
  "terms": {
    "title": "Condizioni di utilizzo",
    "updated": "In vigore e ultimo aggiornamento: 5 settembre 2026",
    "sections": [
      {
        "title": "Gestore e accettazione",
        "paragraphs": [
          "Cookie Build è un server Minecraft indipendente, un sito e un’app complementare forniti da {seller}. Usando i servizi accetti queste condizioni e le regole del server pubblicate. Per domande, scrivi a support@cookie-build.com. Cookie Build non è affiliato né approvato da Mojang, Microsoft, Apple o Google."
        ]
      },
      {
        "title": "Requisiti e account",
        "paragraphs": [
          "L’app complementare è destinata a persone di almeno 13 anni. Se la normativa locale richiede il consenso di un genitore o tutore per i servizi online, devi ottenerlo. L’app crea un account pseudonimo del dispositivo e ti permette di collegarlo a un giocatore Minecraft tramite un codice di breve durata ottenuto in gioco. Proteggi l’accesso al dispositivo e all’account Minecraft. Non condividere mai i codici di collegamento."
        ]
      },
      {
        "title": "Uso consentito",
        "paragraphs": [
          "Non devi:"
        ],
        "items": [
          "barare, sfruttare errori, automatizzare abusi, aggirare la moderazione o interferire con la rete;",
          "molestare, minacciare, impersonare, discriminare o divulgare dati privati di altre persone;",
          "accedere all’account altrui, collegare il giocatore di un’altra persona o eludere i controlli di sicurezza;",
          "inviare consapevolmente segnalazioni false o abusare di inviti, richiami ai giocatori, blocchi e assistenza;",
          "copiare, rivendere o presentare in modo ingannevole i servizi o il marchio Cookie Build."
        ],
        "after": [
          "Amici, gruppi e richiami ai giocatori utilizzano soltanto azioni strutturate e nomi Minecraft. I richiami sono soggetti a limiti e i destinatari possono disattivarli. Questa versione dell’app non include pubblicazioni pubbliche o chat dal vivo a testo libero."
        ]
      },
      {
        "title": "Moderazione, sospensione e ricorsi",
        "paragraphs": [
          "Cookie Build può rimuovere contenuti, limitare funzioni, sospendere giocatori o terminare l’accesso quando ragionevolmente necessario per sicurezza, correttezza del gioco, integrità del servizio, rispetto della legge o violazione sostanziale delle condizioni. Abusi gravi o ripetuti possono comportare provvedimenti immediati. Puoi contestare una decisione scrivendo all’assistenza con nome Minecraft, edizione, data approssimativa e contesto pertinente. I ricorsi vengono esaminati da una persona."
        ]
      },
      {
        "title": "Disponibilità e modifiche",
        "paragraphs": [
          "Giochi, mappe, statistiche, amici, gruppi, eventi e notifiche possono cambiare o risultare temporaneamente indisponibili per manutenzione, sicurezza, compatibilità software o guasti di terzi. Le funzioni che dipendono da mappe mancanti restano bloccate anziché essere presentate come partite funzionanti. Possiamo aggiornare queste condizioni per motivi legali, di sicurezza o di prodotto. Le modifiche sostanziali saranno pubblicate con una nuova data di entrata in vigore prima di diventare efficaci, quando richiesto."
        ]
      },
      {
        "title": "Acquisti e proprietà",
        "paragraphs": [
          "L’app mobile include un negozio di kit e un mercato tra giocatori Skyblock che utilizzano soltanto monete virtuali guadagnate giocando su Cookie Build. Il mercato scambia esclusivamente risorse Skyblock idonee per queste monete. L’app non include pagamenti in denaro reale, abbonamenti, diritti digitali a pagamento o conversioni di monete virtuali in denaro. Codice, grafica e marchi Cookie Build appartengono ai rispettivi titolari. Nomi, marchi ed elementi di gioco Minecraft appartengono a Mojang o Microsoft e vengono usati secondo le linee guida applicabili. Conservi i diritti sui tuoi contenuti e concedi a Cookie Build soltanto i diritti necessari a gestire il servizio."
        ]
      },
      {
        "title": "Acquisti web, abbonamenti e sostegno volontario",
        "items": [
          "Contenuto del prodotto, durata e prezzo totale in EUR, tasse incluse, sono visibili pubblicamente nel catalogo prima dell’accesso. Stripe ospita il pagamento dopo che l’acquirente ha collegato il giocatore Minecraft destinatario.",
          "I prodotti permanenti vengono consegnati digitalmente dopo la conferma del pagamento. Prima dell’ordine l’acquirente deve chiedere separatamente ed espressamente l’esecuzione immediata e riconoscere la perdita del diritto di recesso con la fornitura; nessuna casella è preselezionata.",
          "L’abbonamento Supporter mensile si rinnova ogni mese. Può essere disdetto dal portale Stripe, normalmente alla fine del periodo corrente. Chi sottoscrive per la prima volta può recedere entro 14 giorni dalla cronologia degli acquisti, con cessazione immediata e rimborso totale.",
          "Rimborsi, contestazioni, pagamenti falliti, disdetta, revoca dei diritti e scadenza possono sospendere o rimuovere soltanto gli accessi finanziati dal pagamento interessato. Nessun acquisto offre vantaggi competitivi nei mini-giochi.",
          "Il sostegno volontario è una mancia ripetibile per il servizio, non una raccolta di beneficenza, e non concede rango, cosmetico, oggetto o vantaggio esclusivo.",
          "L’app mobile complementare non offre commercio in denaro reale, checkout o link a pagamenti esterni. Il suo negozio di kit utilizza soltanto monete guadagnate giocando."
        ],
        "after": [
          "L’acquirente può scaricare dall’account web una cronologia durevole degli ordini e il testo e gli orari dei consensi. Per domande su pagamento, disdetta, recesso o rimborso, scrivi a {support} indicando il riferimento dell’ordine, mai i dati della carta."
        ]
      },
      {
        "title": "Responsabilità e legge applicabile",
        "paragraphs": [
          "Il servizio viene fornito con ragionevole cura, ma non possiamo garantire disponibilità ininterrotta o perfetta accuratezza. Nei limiti consentiti dalla legge, Cookie Build non risponde di danni indiretti, perdite di progressi virtuali causate da un’interruzione documentata o guasti di piattaforme di terzi. Nulla in queste condizioni limita i diritti inderogabili dei consumatori o responsabilità che non possono essere escluse per legge. Si applica la legge francese, senza privare i consumatori delle tutele obbligatorie del paese di residenza. Le controversie dovrebbero essere affrontate prima tramite l’assistenza; restano accessibili i tribunali competenti e i diritti inderogabili dei consumatori."
        ]
      },
      {
        "title": "Interrompere l’utilizzo",
        "paragraphs": [
          "Puoi smettere di usare Cookie Build in qualsiasi momento, scollegare identità Minecraft, lasciare amicizie e gruppi, disattivare le notifiche ed eliminare l’account mobile nelle impostazioni. L’informativa sulla privacy spiega il trattamento dei dati dopo l’eliminazione."
        ],
        "link": {
          "path": "/privacy",
          "label": "Informativa sulla privacy"
        }
      }
    ]
  }
},
  es: {
  "sellerUnavailable": "Cookie Build; las compras no están disponibles actualmente",
  "businessId": "Identificador de empresa",
  "vat": "IVA",
  "mediator": "Mediador de consumo",
  "privacy": {
    "title": "Política de privacidad",
    "updated": "Vigente y actualizada por última vez: 5 de septiembre de 2026",
    "sections": [
      {
        "title": "Responsable y ámbito",
        "paragraphs": [
          "Cookie Build está operado por Guillaume Claverie, responsable de los datos personales tratados por el servidor Minecraft, el sitio web y la aplicación complementaria de Cookie Build. Las consultas y solicitudes de privacidad deben dirigirse a support@cookie-build.com. Esta política cubre la aplicación, el sitio web y los servicios de juego."
        ]
      },
      {
        "title": "Datos que tratamos",
        "items": [
          "Un identificador seudónimo de Firebase creado mediante autenticación anónima.",
          "Diagnósticos técnicos de autenticación tratados automáticamente por Firebase, como dirección IP, sistema operativo, modelo, marca y formato del dispositivo, instalador, versiones del SDK e identificador de la aplicación Firebase.",
          "UUID de Minecraft, nombre visible, edición Java o Bedrock, estado de vinculación y estadísticas de juego.",
          "Rango personal de temporada, historial de partidas y actividad por juego, XP total de minijuegos, logros, monedas ganadas, kits desbloqueados y seleccionados, y progreso de objetivos diarios y semanales. Los objetivos se reinician según UTC.",
          "Pertenencia y rol en una isla Skyblock, progreso, misiones, trabajadores, cantidades del almacén virtual, ofertas del mercado, anuncios y ventas, y estados y fechas de depósitos de inventario recuperables tras fallos.",
          "Solicitudes de amistad estructuradas, amistades aceptadas, bloqueos, motivos de denuncia, grupos, integrantes, invitaciones y llamadas a jugadores con formato fijo. La aplicación no incluye chat libre.",
          "Sugerencias de amistad calculadas cuando se solicitan a partir de partidas completadas juntos en los últimos 30 días. Las sugerencias no revelan la partida, su fecha, el resultado, la presencia ni la última actividad, y excluyen relaciones existentes, bloqueos y denuncias.",
          "Presencia derivada de sesiones activas de juego, visible únicamente para amigos aceptados e integrantes del grupo actual, según la preferencia de privacidad: amigos y grupo, solo amigos u oculta, y respetando los bloqueos.",
          "Cuando se activan las notificaciones: identificador de instalación, token FCM, plataforma, versión de la aplicación, idioma, estado de autorización, horas de silencio, preferencias de recordatorios diarios y semanales, y una alerta de conexión opcional elegida para un amigo aceptado. No se permite seguir silenciosamente a jugadores arbitrarios.",
          "Un contador limitado de recordatorios de la aplicación dentro del juego y la fecha de la última visualización, para no insistir con la promoción a jugadores sin vincular.",
          "Mientras la antigua versión 1.2.3 siga disponible para dispositivos Android antiguos: nombre de Minecraft, productos e historial de compras de Google Play, token y firma de compra, e interacciones de visualización de la antigua tienda e integración de Google App Indexing.",
          "Información de seguridad de corta duración, como contadores de limitación de solicitudes asociados a la IP y registros operativos.",
          "Para el comercio web: UUID y nombre de Minecraft de la sesión comercial, hash del token de sesión, referencias de pedidos y productos, precio total y moneda, identificadores y estados de cliente, checkout, suscripción, pago, factura, cargo, reembolso y disputa de Stripe, origen de los derechos de acceso, historial de compras y versión exacta y fechas de las condiciones, ejecución inmediata, renuncia al desistimiento, cancelación y desistimiento."
        ],
        "after": [
          "La aplicación actual no utiliza identificadores publicitarios, seguimiento entre aplicaciones, Firebase Analytics, Crashlytics, ubicación precisa, contactos, micrófono, cámara ni datos de pago. La versión 1.2.3 transmitía solicitudes de la tienda sin cifrar; la actualización sustituye esa implementación en dispositivos compatibles. Esta afirmación se refiere solo a la aplicación móvil. Los pagos web se alojan en Stripe, que trata los datos de contacto, facturación y tarjeta u otros medios de pago. Cookie Build no recibe ni almacena números completos de tarjetas ni códigos de seguridad. Los nombres públicos de Minecraft y las estadísticas de juego pueden aparecer en clasificaciones."
        ]
      },
      {
        "title": "Finalidades y bases jurídicas",
        "items": [
          "Contrato: autenticación, vinculación correcta del jugador, estadísticas, historial, rango, objetivos, isla y almacén Skyblock, gestión del mercado con monedas ganadas, desbloqueo y selección de kits, presencia limitada por la privacidad, amigos y sugerencias de jugadores conocidos recientemente, grupos, eventos y funciones de cuenta solicitadas.",
          "Contrato y medidas precontractuales: vincular al comprador, atender pedidos y suscripciones web, facilitar el historial de compras, cancelaciones y asistencia.",
          "Obligaciones legales: conservar pruebas de transacciones y consentimientos durante los plazos aplicables en materia contable, fiscal y de protección del consumidor.",
          "Consentimiento: notificaciones push, incluidas llamadas a jugadores, recordatorios de objetivos y alertas de conexión de amigos aceptados concretos, configurables por separado y solo tras su activación en la aplicación. El consentimiento puede retirarse en Ajustes. Las horas de silencio suprimen estos avisos.",
          "Intereses legítimos: seguridad de las cuentas, prevención de abusos, gestión de denuncias, juego limpio, diagnóstico de errores y disponibilidad del servicio.",
          "Intereses legítimos: conciliación de eventos de Stripe, prevención de pedidos duplicados o fraudulentos, seguridad de las sesiones, resolución de disputas de pago y conservación de las pruebas mínimas necesarias para defender reclamaciones legales."
        ],
        "after": [
          "Cookie Build no vende datos personales ni los utiliza para publicidad dirigida."
        ]
      },
      {
        "title": "Destinatarios y transferencias internacionales",
        "paragraphs": [
          "Google Firebase proporciona autenticación anónima y entrega de notificaciones push. La aplicación antigua también compartía interacciones de visualización con Google App Indexing. Apple y Google distribuyen la aplicación. El sitio web actual y las compilaciones actuales del código fuente de la aplicación complementaria obtienen avatares públicos de Minecraft mediante Cookie Build usando la UUID pública; mc-heads.net no recibe la IP del dispositivo ni el nombre del jugador por esta vía. Las compilaciones antiguas pueden seguir cargando avatares directamente y revelar esos datos mientras estén disponibles en algún canal de las tiendas. Proveedores situados en la UE alojan el sitio, la API, la base de datos, la monitorización y el servidor Minecraft. Tratan solo los datos necesarios para sus servicios conforme a sus condiciones y garantías. Los servicios de Firebase o de las tiendas pueden tratar datos fuera del EEE mediante mecanismos aplicables, como decisiones de adecuación o cláusulas contractuales tipo.",
          "Stripe proporciona checkout alojado, facturación, facturas, reembolsos, gestión de disputas y portal del cliente. Stripe trata los datos de pago conforme a sus propios avisos de privacidad y puede hacerlo fuera del EEE con sus garantías de transferencia aplicables. Cookie Build transmite la UUID y el nombre de Minecraft, además de las referencias de pedido y producto necesarias para procesar y conciliar el pago."
        ]
      },
      {
        "title": "Conservación",
        "items": [
          "Los códigos de vinculación de un solo uso caducan a los 10 minutos; los registros de auditoría de la solicitud se eliminan a los 7 días.",
          "El perfil móvil activo, las vinculaciones de jugadores y los datos de notificación se conservan mientras sean necesarios para la aplicación o hasta que se elimine la cuenta móvil.",
          "Las amistades, los bloqueos y los grupos activos son datos del servidor asociados a la UUID de Minecraft. Se conservan hasta que se eliminen en la aplicación o el juego, termine el grupo o se aplique el plazo de limpieza publicado correspondiente.",
          "La fecha de una solicitud de amistad impide volver a contactar durante 30 días tras su retirada o rechazo; se elimina a los 90 días.",
          "Los dispositivos revocados se eliminan a los 30 días y las vinculaciones de jugadores revocadas, a los 12 meses.",
          "Las solicitudes e invitaciones rechazadas o caducadas y los grupos finalizados se eliminan a los 90 días.",
          "Las denuncias se conservan hasta 24 meses, o más tiempo si existe un caso de seguridad abierto o una obligación legal.",
          "Los trabajos de notificación entregados se eliminan a los 90 días y los registros de eliminación de cuentas móviles, a los 30 días.",
          "Los resultados de partidas y las estadísticas agregadas se conservan durante la vida del servidor para clasificaciones públicas, juego limpio e integridad, salvo que la ley exija eliminarlos antes.",
          "Los objetivos diarios y semanales, logros, XP, monedas y límites de promoción de la aplicación son datos de juego de Minecraft y siguen la conservación de las estadísticas de juego.",
          "Una sesión comercial web dura como máximo 30 días y el jugador puede revocarla antes. Su caducidad no elimina las transacciones asociadas.",
          "Los pedidos, estados de pago, reembolsos, disputas, facturas y pruebas de consentimiento pueden necesitar conservarse por motivos contables, fiscales, de protección del consumidor y de reclamaciones legales. Para solicitar la revisión o eliminación de datos comerciales, contacta con soporte. Cada solicitud se revisa individualmente teniendo en cuenta las obligaciones de conservación aplicables.",
          "El progreso de las islas Skyblock, el almacén, las transacciones de mercado y los depósitos recuperables tras fallos son datos de juego e integridad y siguen los plazos de conservación de las estadísticas de Minecraft."
        ]
      },
      {
        "title": "Tus opciones y derechos",
        "paragraphs": [
          "Puedes consultar estado, noticias, eventos y clasificaciones sin vincular un jugador. En Ajustes puedes desactivar notificaciones, desvincular jugadores, copiar los datos de tu cuenta de la aplicación y eliminar la cuenta móvil. Esto elimina el perfil móvil seudónimo, dispositivos, preferencias, alertas de conexión de amigos concretos y vinculaciones móviles. No elimina el nombre de Minecraft, las amistades, bloqueos, grupos y datos de seguridad de esa identidad de jugador, ni los datos de integridad del historial público de partidas. Tampoco elimina las bases del rango, XP, monedas, logros, objetivos diarios y semanales ni datos de isla, almacén, mercado y depósitos Skyblock: siguen siendo datos de juego con los controles y plazos propios descritos anteriormente.",
          "Según tu lugar de residencia, puedes solicitar acceso, rectificación, eliminación, limitación, portabilidad u oposición y retirar el consentimiento. Utiliza la dirección de contacto indicada arriba. Puedes reclamar ante tu autoridad de protección de datos; en Francia, la CNIL. Si no tienes la aplicación, puedes utilizar la página de eliminación de cuenta.",
          "Eliminar la cuenta móvil no elimina el historial comercial independiente vinculado a Minecraft. Una solicitud de privacidad puede incluirlo, sujeta a la conservación obligatoria de facturas, contabilidad, prevención del fraude y reclamaciones legales."
        ],
        "link": {
          "path": "/account/delete",
          "label": "Página de eliminación de cuenta"
        }
      },
      {
        "title": "Edad y cambios",
        "paragraphs": [
          "La aplicación complementaria está dirigida a personas de 13 años o más. Quienes no alcancen la edad aplicable en su país para consentir servicios en línea deben utilizar Cookie Build con un progenitor o tutor. Publicaremos aquí los cambios sustanciales con una fecha de vigencia actualizada."
        ]
      },
      {
        "title": "Analítica opcional del sitio web",
        "paragraphs": [
          "Con tu permiso, Google Analytics utiliza cookies para medir visitas a páginas públicas, categorías generales de procedencia, clics hacia el juego o Discord y pasos de la tienda, como seleccionar un destinatario o iniciar el pago. Los eventos solo incluyen categorías de páginas y acciones predefinidas, idioma del sitio, categorías generales de procedencia, identificadores de producto y edición (Java o Bedrock), sin nombres de Minecraft, identificadores de jugadores, códigos de acceso, URL de pago, direcciones de correo, parámetros de URL ni URL de procedencia completas. No se carga ninguna etiqueta de Google Analytics antes de tu permiso. Puedes rechazarlo o retirarlo desde las preferencias de analítica del pie de página. Recordamos tu decisión durante un máximo de 180 días. Estas mediciones basadas en el consentimiento no representan todas las visitas ni las compras. Google recibe datos técnicos de conexión para prestar el servicio; nuestros informes no utilizan señales publicitarias ni identificadores de usuario entre sitios. La duración de las cookies de analítica se limita a 180 días. Google puede tratar datos fuera del EEE con sus garantías de transferencia aplicables."
        ]
      }
    ]
  },
  "terms": {
    "title": "Condiciones de servicio",
    "updated": "Vigentes y actualizadas por última vez: 5 de septiembre de 2026",
    "sections": [
      {
        "title": "Operador y aceptación",
        "paragraphs": [
          "Cookie Build es un servidor Minecraft independiente, con sitio web y aplicación complementaria, ofrecido por {seller}. Al utilizarlo, aceptas estas condiciones y las reglas publicadas del servidor. Dirige tus consultas a support@cookie-build.com. Cookie Build no está afiliado ni respaldado por Mojang, Microsoft, Apple o Google."
        ]
      },
      {
        "title": "Requisitos y cuentas",
        "paragraphs": [
          "La aplicación complementaria está dirigida a personas de 13 años o más. Cuando la legislación local exija permiso de un progenitor o tutor para servicios en línea, debes contar con él. La aplicación crea una cuenta de dispositivo seudónima y permite vincularla a un jugador de Minecraft mediante un código de corta duración obtenido en el juego. Protege el acceso a tu dispositivo y a tu cuenta de Minecraft. Nunca compartas códigos de vinculación."
        ]
      },
      {
        "title": "Uso aceptable",
        "paragraphs": [
          "No está permitido:"
        ],
        "items": [
          "hacer trampas, explotar errores, automatizar abusos, eludir la moderación o perturbar la red;",
          "acosar, amenazar, suplantar, discriminar o exponer datos personales de otra persona;",
          "acceder a cuentas ajenas, vincular jugadores que no te pertenecen o eludir controles de seguridad;",
          "enviar denuncias deliberadamente falsas o abusar de invitaciones, llamadas a jugadores, bloqueos y canales de soporte;",
          "copiar, revender o presentar de forma engañosa los servicios o la marca Cookie Build."
        ],
        "after": [
          "Amigos, grupos y llamadas a jugadores utilizan solo acciones predefinidas y nombres de Minecraft. Las llamadas tienen límites de frecuencia y los destinatarios pueden desactivarlas. Esta versión de la aplicación no incluye publicaciones públicas ni chat libre en directo."
        ]
      },
      {
        "title": "Moderación, suspensión y reclamaciones",
        "paragraphs": [
          "Cookie Build puede retirar contenido, limitar funciones, suspender jugadores o finalizar el acceso cuando sea razonablemente necesario para la seguridad, el juego limpio, la integridad del servicio, el cumplimiento legal o ante un incumplimiento sustancial de estas condiciones. Los abusos graves o repetidos pueden dar lugar a medidas inmediatas. Para recurrir, escribe a soporte indicando nombre de Minecraft, edición, fecha aproximada y contexto pertinente. Las reclamaciones son revisadas por una persona."
        ]
      },
      {
        "title": "Disponibilidad y cambios",
        "paragraphs": [
          "Los juegos, mapas, estadísticas, amigos, grupos, eventos y notificaciones pueden cambiar o dejar de estar disponibles temporalmente por mantenimiento, seguridad, compatibilidad de software o incidencias de terceros. Las funciones cuyos mapas falten permanecen bloqueadas en lugar de ofrecerse en un estado defectuoso. Podemos actualizar estas condiciones por motivos legales, de seguridad o de producto. Cuando sea necesario, los cambios sustanciales se publicarán con una nueva fecha de vigencia antes de entrar en vigor."
        ]
      },
      {
        "title": "Compras y propiedad",
        "paragraphs": [
          "La aplicación incluye una tienda de kits y un mercado de jugadores Skyblock que utilizan únicamente monedas virtuales ganadas jugando en Cookie Build. El mercado solo intercambia recursos de juego Skyblock aptos por esas monedas. La aplicación no incluye pagos con dinero real, suscripciones, derechos digitales de pago ni conversión de monedas virtuales en dinero. El código, las ilustraciones y las marcas de Cookie Build pertenecen a sus respectivos titulares. Los nombres, marcas y elementos de Minecraft pertenecen a Mojang o Microsoft y se utilizan conforme a las directrices de uso aplicables. Conservas los derechos sobre tu propio contenido y solo concedes a Cookie Build los permisos necesarios para operar el servicio."
        ]
      },
      {
        "title": "Compras web, suscripciones y apoyo voluntario",
        "items": [
          "El contenido de los productos, su duración y el precio total en EUR con impuestos incluidos son visibles públicamente en el catálogo antes de iniciar sesión. Stripe aloja el pago después de que el comprador vincule al jugador de Minecraft destinatario.",
          "Los productos permanentes se entregan digitalmente tras la confirmación del pago. Antes de realizar el pedido, el comprador debe solicitar de forma separada y expresa la ejecución inmediata y reconocer la pérdida del derecho de desistimiento al suministrarse el contenido; ninguna casilla está premarcada.",
          "La suscripción mensual Supporter se renueva cada mes. Puede cancelarse mediante el portal de Stripe, normalmente al final del período. Quienes se suscriben por primera vez pueden desistir en un plazo de 14 días desde el historial de compras, con finalización inmediata y reembolso completo.",
          "Los reembolsos, disputas, pagos fallidos, cancelaciones, revocaciones y vencimientos pueden suspender o retirar únicamente los accesos financiados por el pago correspondiente. Ninguna compra ofrece una ventaja competitiva en los minijuegos.",
          "El apoyo voluntario es una propina repetible al servicio, no una recaudación benéfica, y no concede rango, cosmético, objeto ni ventaja exclusiva.",
          "La aplicación móvil complementaria no ofrece comercio con dinero real, checkout ni enlaces de pago externos. Su tienda de kits utiliza exclusivamente monedas ganadas en el juego."
        ],
        "after": [
          "El comprador puede descargar un historial duradero de pedidos y el texto y las fechas de sus consentimientos desde su cuenta web. Para consultas sobre pagos, cancelaciones, desistimientos o reembolsos, escribe a {support} con la referencia del pedido, nunca con datos de tarjeta."
        ]
      },
      {
        "title": "Responsabilidad y legislación aplicable",
        "paragraphs": [
          "Prestamos el servicio con diligencia razonable, pero no podemos garantizar disponibilidad ininterrumpida ni exactitud perfecta. En la medida permitida por la ley, Cookie Build no responde de daños indirectos, pérdida de progreso virtual debida a una incidencia documentada ni fallos de plataformas externas. Esto no afecta a los derechos imperativos de los consumidores ni a responsabilidades que legalmente no puedan excluirse. Se aplica la legislación francesa sin privarte de las protecciones obligatorias del consumidor en tu país de residencia. Los conflictos deberían intentarse resolver primero mediante soporte; siguen disponibles los tribunales competentes y los derechos imperativos del consumidor."
        ]
      },
      {
        "title": "Dejar de utilizar el servicio",
        "paragraphs": [
          "Puedes dejar de utilizarlo en cualquier momento, desvincular identidades de Minecraft, abandonar amistades y grupos, desactivar notificaciones y eliminar la cuenta móvil desde Ajustes. La política de privacidad explica cómo se tratan los datos después de la eliminación."
        ],
        "link": {
          "path": "/privacy",
          "label": "Política de privacidad"
        }
      }
    ]
  }
},
};

export function legalTranslation(locale: SiteLocaleCode): LegalTranslation | undefined {
  return locale === "en" || locale === "fr" ? undefined : LEGAL_COPY[locale];
}
