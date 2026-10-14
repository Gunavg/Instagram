"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import useAuthStore from "@/store/authStore";

export const LANGUAGES = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "pt", label: "Portuguese", nativeLabel: "Português" },
  { code: "zh", label: "Chinese", nativeLabel: "中文" },
  { code: "fr", label: "French", nativeLabel: "Français" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
type Dictionary = Record<string, string>;

const en: Dictionary = {
  home:"Home", search:"Search", explore:"Explore", reels:"Reels", messages:"Messages", notifications:"Notifications",
  create:"Create", profile:"Profile", settings:"Settings", activity:"Activity", saved:"Saved", darkMode:"Dark mode",
  lightMode:"Light mode", logout:"Log out", more:"More", subscription:"Subscription", language:"Language",
  selectLanguage:"Select language", mobileNumber:"Mobile number", saveMobile:"Save mobile number", save:"Save",
  cancel:"Cancel", verify:"Verify", resend:"Resend code", verification:"Verification required",
  enterOtp:"Enter the 6-digit code", codeSent:"A verification code was sent to", expires:"Code expires in",
  changeLanguage:"Change language", currentLanguage:"Current language",
  addMobile:"Add your mobile number to use this language.", languageUpdated:"Language updated successfully.",
  loadingPosts:"Loading posts...", caughtUp:"You're all caught up", caughtUpDescription:"You've seen all new posts from the past 3 days.",
  suggested:"Suggested for you", following:"Following", follow:"Follow", like:"Like", likes:"likes", comment:"Comment",
  addComment:"Add a comment…", you:"You", yourStory:"Your story", loadingProfile:"Loading profile...", loading:"Loading...",
  userNotFound:"User not found", noResults:"No results found", loadingAnalytics:"Loading analytics...",
  analyticsUnavailable:"Analytics unavailable.", tryAgain:"Try again", storyAnalytics:"Story Analytics",
  archivedStory:"Archived Story", updating:"Updating...", views:"Views", uniqueViewers:"Unique Viewers",
  reactions:"Reactions", replies:"Replies", completion:"Completion", completionRate:"Completion Rate",
  reactionBreakdown:"Reaction Breakdown", noReactions:"No reactions yet.", viewTimeline:"View Timeline",
  noViews:"No views yet.", viewers:"Viewers", shown:"shown", completed:"Completed", viewed:"Viewed",
  analyticsUpdateNote:"Analytics update automatically when viewers view, react, or reply to this story.",
  storyHighlights:"Story Highlights", highlightsDescription:"Keep your favorite Stories on your profile.",
  loadingHighlights:"Loading highlights...", noHighlights:"No story highlights yet",
  addExpiredStories:"Add your expired Stories to keep them on your profile.", createNewHighlight:"Create New Highlight",
  highlightName:"Highlight name", selectArchivedStories:"Select archived Stories:", noArchivedStories:"No archived Stories available.",
  storiesAppearAfterExpire:"Stories will appear here after they expire.", createHighlight:"Create Highlight",
  deletingHighlight:"Delete highlight?", storyDeleteAnalytics:"Your Stories and analytics will not be deleted.",
  manageLanguageVerification:"Manage your language and verification settings",
  chooseLanguageAcrossApp:"Choose the language you want to use across the app.",
  secureLanguageVerification:"Add a mobile number for secure language verification.",
  validMobile:"Enter a valid mobile number with country code.",
  mobileSaved:"Mobile number saved", unableSaveMobile:"Unable to save mobile number.",
  sendVerification:"Send verification code", sending:"Sending…", submitting:"Submitting…", codeSentSuccess:"Verification code sent",
  verificationFailed:"Verification failed.", unableSendCode:"Unable to send verification code.", codeResent:"Code resent",
  unableResend:"Unable to resend code.", addMobileBeforeLanguage:"Add a registered mobile number before selecting this language.",
  chooseSubscription:"Choose your subscription", membership:"Membership", currentPlan:"Current plan",
  subscriptionActivated:"Subscription activated", requiresVerificationCode:"requires a one-time verification code.", paymentVerified:"Your payment has been verified successfully.",
  paymentVerificationFailed:"Payment verification failed.", unableStartPayment:"Unable to start payment.",
  paymentHours:"Payment hours: 5:00 AM–11:00 AM IST.", planRemainsActive:"Your current plan remains active until the billing period ends.",
  unableCancelSubscription:"Unable to cancel subscription.", month:"month", current:"CURRENT",
  validThrough:"Valid through", cancelSubscription:"Cancel subscription", cancellationScheduled:"Cancellation scheduled",
  paymentAvailability:"Payment availability", paymentAvailabilityText:"New subscription payments are accepted only between 5:00 AM and 11:00 AM IST. Attempts outside this window are rejected before checkout.",
  openingPayment:"Opening payment…", choose:"Choose", includedDefault:"Included by default", planCurrent:"Your current plan",
  postLimit:"Your plan controls how many active posts you can publish. Paid plans renew monthly.", useInternational:"Use an international format, for example +91 9876543210.", saving:"Saving…", submit:"Submit", back:"Back", sendToMobile:"The code will be sent to your registered mobile number.", sendToEmail:"The code will be sent to your registered email address.",
};


/* Plan/status labels used by the subscription UI. */
Object.assign(en, {
  freePlan:"Free Plan", bronzePlan:"Bronze Plan", silverPlan:"Silver Plan", goldPlan:"Gold Plan",
  onePost:"1 post", threePosts:"3 posts", fivePosts:"5 posts", unlimitedPosts:"Unlimited posts",
  freeDescription:"Get started with a basic posting allowance.",
  bronzeDescription:"A little more room for your monthly content.",
  silverDescription:"More posting capacity for growing creators.",
  goldDescription:"Unlimited posts with the highest plan allowance.",
  planWord:"Plan",
  "planNames.free":"Free Plan", "planNames.bronze":"Bronze Plan", "planNames.silver":"Silver Plan", "planNames.gold":"Gold Plan",
  "status.active":"Active", "status.past_due":"Past due", "status.canceled":"Canceled", "status.incomplete":"Incomplete", "status.unpaid":"Unpaid"
});

const translations: Record<LanguageCode, Dictionary> = {
  en: Object.assign({...en}, {}),
  es: Object.assign({...en}, {"reels":"Reels","likes":"me gusta","you":"Tú","loadingPosts":"Cargando publicaciones...","caughtUp":"Estás al día","caughtUpDescription":"Has visto todas las publicaciones nuevas de los últimos 3 días.","suggested":"Sugerencias para ti","archivedStory":"Historia archivada","updating":"Actualizando...","completion":"Finalización","reactionBreakdown":"Desglose de reacciones","noReactions":"Aún no hay reacciones.","noViews":"Aún no hay visualizaciones.","viewers":"Espectadores","shown":"mostrados","completed":"Completado","viewed":"Visto","analyticsUpdateNote":"Las estadísticas se actualizan cuando los usuarios ven, reaccionan o responden a esta historia.","highlightsDescription":"Guarda tus historias favoritas en tu perfil.","loadingHighlights":"Cargando destacados...","noHighlights":"Aún no hay destacados","addExpiredStories":"Añade historias caducadas para mantenerlas en tu perfil.","createNewHighlight":"Crear destacado nuevo","highlightName":"Nombre del destacado","selectArchivedStories":"Selecciona historias archivadas:","noArchivedStories":"No hay historias archivadas.","storiesAppearAfterExpire":"Las historias aparecerán aquí cuando caduquen.","deletingHighlight":"¿Eliminar destacado?","storyDeleteAnalytics":"Las historias y sus estadísticas no se eliminarán.","manageLanguageVerification":"Administra el idioma y la verificación","chooseLanguageAcrossApp":"Elige el idioma de la aplicación.","secureLanguageVerification":"Añade un móvil para la verificación segura.","addMobile":"Añade tu móvil para usar este idioma.","submitting":"Enviando…","addMobileBeforeLanguage":"Añade un móvil registrado antes de elegir este idioma.","requiresVerificationCode":"requiere un código de verificación.","planRemainsActive":"Tu plan actual seguirá activo hasta el final del periodo.","validThrough":"Válido hasta","cancelSubscription":"Cancelar suscripción","cancellationScheduled":"Cancelación programada","paymentAvailability":"Disponibilidad de pagos","paymentAvailabilityText":"Los pagos solo se aceptan de 5:00 a 11:00 IST. Fuera de ese horario se rechazan antes del pago.","openingPayment":"Abriendo pago…","choose":"Elegir","includedDefault":"Incluido por defecto","planCurrent":"Tu plan actual","postLimit":"Tu plan determina cuántas publicaciones puedes realizar. Los planes de pago se renuevan mensualmente.","useInternational":"Usa el formato internacional, por ejemplo +91 9876543210.","saving":"Guardando…","sendToMobile":"El código se enviará a tu móvil registrado.","sendToEmail":"El código se enviará a tu correo registrado.","reports":"Informes","comments":"Comentarios","scheduledPosts":"Publicaciones programadas","adminDashboard":"Panel de administración"}),
  hi: Object.assign({...en}, {"reels":"रील्स","likes":"पसंद","you":"आप","loadingPosts":"पोस्ट लोड हो रहे हैं…","caughtUp":"आपने सभी नई पोस्ट देख ली हैं","caughtUpDescription":"आपने पिछले 3 दिनों की सभी नई पोस्ट देख ली हैं।","suggested":"आपके लिए सुझाव","archivedStory":"संग्रहीत स्टोरी","updating":"अपडेट हो रहा है…","completion":"पूर्णता","reactionBreakdown":"प्रतिक्रियाओं का विवरण","noReactions":"अभी कोई प्रतिक्रिया नहीं।","noViews":"अभी कोई व्यू नहीं।","viewers":"दर्शक","shown":"दिखाए गए","completed":"पूरा हुआ","viewed":"देखा गया","analyticsUpdateNote":"दर्शकों के देखने, प्रतिक्रिया देने या जवाब देने पर आँकड़े अपने आप अपडेट होते हैं।","highlightsDescription":"अपनी पसंदीदा स्टोरी को प्रोफ़ाइल पर रखें।","loadingHighlights":"हाइलाइट लोड हो रहे हैं…","noHighlights":"अभी कोई स्टोरी हाइलाइट नहीं","addExpiredStories":"समाप्त हुई स्टोरी को प्रोफ़ाइल पर रखने के लिए जोड़ें।","createNewHighlight":"नया हाइलाइट बनाएँ","highlightName":"हाइलाइट का नाम","selectArchivedStories":"संग्रहीत स्टोरी चुनें:","noArchivedStories":"कोई संग्रहीत स्टोरी उपलब्ध नहीं।","storiesAppearAfterExpire":"समाप्त होने के बाद स्टोरी यहाँ दिखाई देंगी।","deletingHighlight":"हाइलाइट हटाएँ?","storyDeleteAnalytics":"आपकी स्टोरी और आँकड़े हटाए नहीं जाएँगे।","manageLanguageVerification":"भाषा और सत्यापन सेटिंग प्रबंधित करें","chooseLanguageAcrossApp":"ऐप के लिए अपनी भाषा चुनें।","secureLanguageVerification":"सुरक्षित सत्यापन के लिए मोबाइल नंबर जोड़ें।","addMobile":"इस भाषा का उपयोग करने के लिए मोबाइल नंबर जोड़ें।","submitting":"सबमिट हो रहा है…","addMobileBeforeLanguage":"यह भाषा चुनने से पहले पंजीकृत मोबाइल जोड़ें।","requiresVerificationCode":"के लिए सत्यापन कोड आवश्यक है।","planRemainsActive":"आपका वर्तमान प्लान अवधि समाप्त होने तक सक्रिय रहेगा।","validThrough":"इस तारीख तक मान्य","cancelSubscription":"सदस्यता रद्द करें","cancellationScheduled":"रद्दीकरण निर्धारित","paymentAvailability":"भुगतान उपलब्धता","paymentAvailabilityText":"भुगतान केवल IST सुबह 5 से 11 बजे तक स्वीकार किए जाते हैं।","openingPayment":"भुगतान खुल रहा है…","choose":"चुनें","includedDefault":"डिफ़ॉल्ट रूप से शामिल","planCurrent":"आपका वर्तमान प्लान","postLimit":"आपका प्लान प्रकाशित पोस्ट की सीमा तय करता है। भुगतान वाले प्लान मासिक नवीनीकृत होते हैं।","useInternational":"अंतरराष्ट्रीय प्रारूप का उपयोग करें, जैसे +91 9876543210।","saving":"सेव हो रहा है…","sendToMobile":"कोड आपके पंजीकृत मोबाइल पर भेजा जाएगा।","sendToEmail":"कोड आपके पंजीकृत ईमेल पर भेजा जाएगा।","reports":"रिपोर्ट","comments":"टिप्पणियाँ","scheduledPosts":"शेड्यूल पोस्ट","adminDashboard":"एडमिन डैशबोर्ड"}),
  pt: Object.assign({...en}, {"reels":"Reels","likes":"curtidas","you":"Você","loadingPosts":"Carregando publicações...","caughtUp":"Você está em dia","caughtUpDescription":"Você viu todas as publicações novas dos últimos 3 dias.","suggested":"Sugestões para você","archivedStory":"Story arquivado","updating":"Atualizando…","completion":"Conclusão","reactionBreakdown":"Resumo das reações","noReactions":"Ainda sem reações.","noViews":"Ainda sem visualizações.","viewers":"Visualizadores","shown":"exibidos","completed":"Concluído","viewed":"Visualizado","analyticsUpdateNote":"As estatísticas atualizam quando alguém visualiza, reage ou responde ao story.","highlightsDescription":"Guarde seus stories favoritos no perfil.","loadingHighlights":"Carregando destaques…","noHighlights":"Ainda não há destaques","addExpiredStories":"Adicione stories expirados para mantê-los no perfil.","createNewHighlight":"Criar novo destaque","highlightName":"Nome do destaque","selectArchivedStories":"Selecione stories arquivados:","noArchivedStories":"Nenhum story arquivado disponível.","storiesAppearAfterExpire":"Os stories aparecem aqui após expirarem.","deletingHighlight":"Excluir destaque?","storyDeleteAnalytics":"Os stories e suas estatísticas não serão excluídos.","manageLanguageVerification":"Gerencie idioma e verificação","chooseLanguageAcrossApp":"Escolha o idioma do aplicativo.","secureLanguageVerification":"Adicione um celular para verificação segura.","addMobile":"Adicione um celular para usar este idioma.","submitting":"Enviando…","addMobileBeforeLanguage":"Adicione um celular registrado antes de escolher este idioma.","requiresVerificationCode":"exige um código de verificação.","planRemainsActive":"Seu plano atual permanece ativo até o fim do período.","validThrough":"Válido até","cancelSubscription":"Cancelar assinatura","cancellationScheduled":"Cancelamento agendado","paymentAvailability":"Disponibilidade de pagamento","paymentAvailabilityText":"Pagamentos só são aceitos entre 5h e 11h IST.","openingPayment":"Abrindo pagamento…","choose":"Escolher","includedDefault":"Incluído por padrão","planCurrent":"Seu plano atual","postLimit":"Seu plano limita o número de publicações. Os planos pagos são renovados mensalmente.","useInternational":"Use o formato internacional, por exemplo +91 9876543210.","saving":"Salvando…","sendToMobile":"O código será enviado ao celular registrado.","sendToEmail":"O código será enviado ao e-mail registrado.","reports":"Denúncias","comments":"Comentários","scheduledPosts":"Publicações agendadas","adminDashboard":"Painel administrativo"}),
  zh: Object.assign({...en}, {"reels":"短视频","likes":"赞","you":"你","loadingPosts":"正在加载帖子…","caughtUp":"你已浏览完最新内容","caughtUpDescription":"你已看完过去3天的所有新帖子。","suggested":"为你推荐","archivedStory":"已归档快拍","updating":"正在更新…","completion":"完成情况","reactionBreakdown":"反应统计","noReactions":"暂无反应。","noViews":"暂无浏览。","viewers":"访客","shown":"已显示","completed":"已完成","viewed":"已浏览","analyticsUpdateNote":"有人浏览、回应或回复快拍时，分析数据会自动更新。","highlightsDescription":"将喜欢的快拍保留在个人资料中。","loadingHighlights":"正在加载精选…","noHighlights":"暂无快拍精选","addExpiredStories":"添加已过期快拍，以便保留在个人资料中。","createNewHighlight":"创建新精选","highlightName":"精选名称","selectArchivedStories":"选择已归档快拍：","noArchivedStories":"没有可用的已归档快拍。","storiesAppearAfterExpire":"快拍过期后会显示在这里。","deletingHighlight":"删除精选？","storyDeleteAnalytics":"不会删除快拍及其分析数据。","manageLanguageVerification":"管理语言和验证设置","chooseLanguageAcrossApp":"选择应用界面语言。","secureLanguageVerification":"添加手机号以进行安全验证。","addMobile":"请添加手机号以使用此语言。","submitting":"正在提交…","addMobileBeforeLanguage":"选择此语言前，请添加已注册手机号。","requiresVerificationCode":"需要一次性验证码。","planRemainsActive":"当前方案在账期结束前仍然有效。","validThrough":"有效期至","cancelSubscription":"取消订阅","cancellationScheduled":"已安排取消","paymentAvailability":"付款时段","paymentAvailabilityText":"仅接受印度标准时间上午5点至11点的付款。","openingPayment":"正在打开付款…","choose":"选择","includedDefault":"默认包含","planCurrent":"当前方案","postLimit":"方案决定可发布帖子数量，付费方案按月续订。","useInternational":"请使用国际格式，例如 +91 9876543210。","saving":"正在保存…","sendToMobile":"验证码将发送到已注册手机号。","sendToEmail":"验证码将发送到已注册邮箱。","reports":"举报","comments":"评论","scheduledPosts":"定时帖子","adminDashboard":"管理员面板"}),
  fr: Object.assign({...en}, {"reels":"Reels","likes":"J’aime","you":"Vous","loadingPosts":"Chargement des publications…","caughtUp":"Vous êtes à jour","caughtUpDescription":"Vous avez vu toutes les nouvelles publications des 3 derniers jours.","suggested":"Suggestions pour vous","archivedStory":"Story archivée","updating":"Mise à jour…","completion":"Achèvement","reactionBreakdown":"Détail des réactions","noReactions":"Aucune réaction pour le moment.","noViews":"Aucune vue pour le moment.","viewers":"Spectateurs","shown":"affichés","completed":"Terminée","viewed":"Vue","analyticsUpdateNote":"Les statistiques se mettent à jour lors des vues, réactions et réponses à cette story.","highlightsDescription":"Gardez vos stories préférées sur votre profil.","loadingHighlights":"Chargement des stories à la une…","noHighlights":"Aucune story à la une","addExpiredStories":"Ajoutez les stories expirées pour les conserver sur votre profil.","createNewHighlight":"Créer une story à la une","highlightName":"Nom de la rubrique","selectArchivedStories":"Sélectionner les stories archivées :","noArchivedStories":"Aucune story archivée disponible.","storiesAppearAfterExpire":"Les stories apparaîtront ici après expiration.","deletingHighlight":"Supprimer cette rubrique ?","storyDeleteAnalytics":"Les stories et leurs statistiques ne seront pas supprimées.","manageLanguageVerification":"Gérez la langue et la vérification","chooseLanguageAcrossApp":"Choisissez la langue de l’application.","secureLanguageVerification":"Ajoutez un mobile pour une vérification sécurisée.","addMobile":"Ajoutez un mobile pour utiliser cette langue.","submitting":"Envoi…","addMobileBeforeLanguage":"Ajoutez un numéro mobile enregistré avant de choisir cette langue.","requiresVerificationCode":"nécessite un code de vérification.","planRemainsActive":"Votre forfait reste actif jusqu’à la fin de la période.","validThrough":"Valable jusqu’au","cancelSubscription":"Annuler l’abonnement","cancellationScheduled":"Annulation programmée","paymentAvailability":"Disponibilité des paiements","paymentAvailabilityText":"Les paiements sont acceptés uniquement entre 5 h et 11 h IST.","openingPayment":"Ouverture du paiement…","choose":"Choisir","includedDefault":"Inclus par défaut","planCurrent":"Votre forfait actuel","postLimit":"Votre forfait définit le nombre de publications. Les forfaits payants sont renouvelés chaque mois.","useInternational":"Utilisez le format international, par exemple +91 9876543210.","saving":"Enregistrement…","sendToMobile":"Le code sera envoyé au mobile enregistré.","sendToEmail":"Le code sera envoyé à l’adresse e-mail enregistrée.","reports":"Signalements","comments":"Commentaires","scheduledPosts":"Publications programmées","adminDashboard":"Tableau de bord admin"})
};

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string) => string;
}
const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    const saved = (user?.language || localStorage.getItem("language")) as LanguageCode;
    if (LANGUAGES.some((item) => item.code === saved)) setLanguageState(saved);
  }, [user?.language]);

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("language", language);
  }, [language]);

  // Intentional: caller invokes this only after server-side verification.
  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    localStorage.setItem("language", next);
    if (user) {
      const nextUser = { ...user, language: next };
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
    }
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key: string) => translations[language][key] || en[key] || key,
  }), [language, user]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LanguageProvider");
  return context;
};