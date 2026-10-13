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
  en,
  es:Object.assign({...en}, {"home":"Inicio","search":"Buscar","explore":"Explorar","reels":"Reels","messages":"Mensajes","notifications":"Notificaciones","create":"Crear","profile":"Perfil","settings":"Configuración","activity":"Actividad","saved":"Guardados","darkMode":"Modo oscuro","lightMode":"Modo claro","logout":"Cerrar sesión","more":"Más","subscription":"Suscripción","language":"Idioma","selectLanguage":"Seleccionar idioma","mobileNumber":"Número de móvil","saveMobile":"Guardar número de móvil","save":"Guardar","cancel":"Cancelar","verify":"Verificar","resend":"Reenviar código","verification":"Verificación requerida","enterOtp":"Introduce el código de 6 dígitos","codeSent":"Se envió un código de verificación a","expires":"El código caduca en","changeLanguage":"Cambiar idioma","currentLanguage":"Idioma actual","languageUpdated":"Idioma actualizado correctamente.","validMobile":"Introduce un número móvil válido con código de país.","mobileSaved":"Número móvil guardado","unableSaveMobile":"No se pudo guardar el número móvil.","sendVerification":"Enviar código de verificación","sending":"Enviando…","verificationFailed":"Falló la verificación.","unableSendCode":"No se pudo enviar el código.","codeResent":"Código reenviado","unableResend":"No se pudo reenviar el código.","chooseSubscription":"Elige tu suscripción","membership":"Membresía","currentPlan":"Plan actual","subscriptionActivated":"Suscripción activada","paymentVerified":"Tu pago se verificó correctamente.","paymentVerificationFailed":"Falló la verificación del pago.","unableStartPayment":"No se pudo iniciar el pago.","paymentHours":"Pagos de 5:00 a 11:00 IST.","unableCancelSubscription":"No se pudo cancelar la suscripción.","month":"mes","current":"ACTUAL","freePlan":"Plan gratuito","bronzePlan":"Plan Bronce","silverPlan":"Plan Plata","goldPlan":"Plan Oro","onePost":"1 publicación","threePosts":"3 publicaciones","fivePosts":"5 publicaciones","unlimitedPosts":"Publicaciones ilimitadas","planWord":"Plan","status.active":"Activo","status.past_due":"Vencido","status.canceled":"Cancelado","status.incomplete":"Incompleto","status.unpaid":"No pagado","back":"Volver","submit":"Enviar","loading":"Cargando…","noResults":"No se encontraron resultados.","storyAnalytics":"Estadísticas de historias","views":"Visualizaciones","uniqueViewers":"Espectadores únicos","reactions":"Reacciones","replies":"Respuestas","completionRate":"Tasa de finalización","viewTimeline":"Cronología de visualizaciones","storyHighlights":"Destacados","createHighlight":"Crear destacado","yourStory":"Tu historia","like":"Me gusta","comment":"Comentar","addComment":"Añadir un comentario…"}),
    freePlan:"Plan gratuito", bronzePlan:"Plan Bronce", silverPlan:"Plan Plata", goldPlan:"Plan Oro",
    onePost:"1 publicación", threePosts:"3 publicaciones", fivePosts:"5 publicaciones", unlimitedPosts:"Publicaciones ilimitadas",
    planWord:"Plan", "status.active":"Activo", "status.past_due":"Vencido", "status.canceled":"Cancelado", "status.incomplete":"Incompleto", "status.unpaid":"No pagado"
  }),
  hi:Object.assign({...en}, {"home":"होम","search":"खोजें","explore":"एक्सप्लोर","reels":"रील्स","messages":"संदेश","notifications":"सूचनाएँ","create":"बनाएँ","profile":"प्रोफ़ाइल","settings":"सेटिंग्स","activity":"गतिविधि","saved":"सेव किए गए","darkMode":"डार्क मोड","lightMode":"लाइट मोड","logout":"लॉग आउट","more":"और","subscription":"सदस्यता","language":"भाषा","selectLanguage":"भाषा चुनें","mobileNumber":"मोबाइल नंबर","saveMobile":"मोबाइल नंबर सेव करें","save":"सेव करें","cancel":"रद्द करें","verify":"सत्यापित करें","resend":"कोड फिर भेजें","verification":"सत्यापन आवश्यक","enterOtp":"6 अंकों का कोड दर्ज करें","codeSent":"सत्यापन कोड भेजा गया","expires":"कोड समाप्त होगा","changeLanguage":"भाषा बदलें","currentLanguage":"वर्तमान भाषा","languageUpdated":"भाषा सफलतापूर्वक बदल गई।","validMobile":"देश कोड सहित सही मोबाइल नंबर दर्ज करें।","mobileSaved":"मोबाइल नंबर सेव हुआ","unableSaveMobile":"मोबाइल नंबर सेव नहीं हो सका।","sendVerification":"सत्यापन कोड भेजें","sending":"भेजा जा रहा है…","verificationFailed":"सत्यापन विफल हुआ।","unableSendCode":"कोड नहीं भेजा जा सका।","codeResent":"कोड फिर भेजा गया","unableResend":"कोड दोबारा नहीं भेजा जा सका।","chooseSubscription":"अपनी सदस्यता चुनें","membership":"सदस्यता","currentPlan":"वर्तमान प्लान","subscriptionActivated":"सदस्यता सक्रिय हुई","paymentVerified":"भुगतान सफलतापूर्वक सत्यापित हुआ।","paymentVerificationFailed":"भुगतान सत्यापन विफल हुआ।","unableStartPayment":"भुगतान शुरू नहीं हो सका।","paymentHours":"भुगतान समय: सुबह 5 से 11 बजे IST।","unableCancelSubscription":"सदस्यता रद्द नहीं हो सकी।","month":"महीना","current":"वर्तमान","freePlan":"फ्री प्लान","bronzePlan":"ब्रॉन्ज़ प्लान","silverPlan":"सिल्वर प्लान","goldPlan":"गोल्ड प्लान","onePost":"1 पोस्ट","threePosts":"3 पोस्ट","fivePosts":"5 पोस्ट","unlimitedPosts":"असीमित पोस्ट","planWord":"प्लान","status.active":"सक्रिय","status.past_due":"बकाया","status.canceled":"रद्द","status.incomplete":"अपूर्ण","status.unpaid":"भुगतान नहीं हुआ","back":"वापस","submit":"जमा करें","loading":"लोड हो रहा है…","noResults":"कोई परिणाम नहीं मिला।","storyAnalytics":"स्टोरी विश्लेषण","views":"व्यू","uniqueViewers":"अलग दर्शक","reactions":"प्रतिक्रियाएँ","replies":"जवाब","completionRate":"पूर्णता दर","viewTimeline":"व्यू समयरेखा","storyHighlights":"स्टोरी हाइलाइट्स","createHighlight":"हाइलाइट बनाएँ","yourStory":"आपकी स्टोरी","like":"पसंद","comment":"टिप्पणी","addComment":"टिप्पणी जोड़ें…"}),
  pt:Object.assign({...en}, {"home":"Início","search":"Pesquisar","explore":"Explorar","reels":"Reels","messages":"Mensagens","notifications":"Notificações","create":"Criar","profile":"Perfil","settings":"Configurações","activity":"Atividade","saved":"Salvos","darkMode":"Modo escuro","lightMode":"Modo claro","logout":"Sair","more":"Mais","subscription":"Assinatura","language":"Idioma","selectLanguage":"Selecionar idioma","mobileNumber":"Número de celular","saveMobile":"Salvar celular","save":"Salvar","cancel":"Cancelar","verify":"Verificar","resend":"Reenviar código","verification":"Verificação necessária","enterOtp":"Digite o código de 6 dígitos","codeSent":"Um código foi enviado para","expires":"O código expira em","changeLanguage":"Alterar idioma","currentLanguage":"Idioma atual","languageUpdated":"Idioma atualizado com sucesso.","validMobile":"Digite um celular válido com código do país.","mobileSaved":"Celular salvo","unableSaveMobile":"Não foi possível salvar o celular.","sendVerification":"Enviar código de verificação","sending":"Enviando…","verificationFailed":"Falha na verificação.","unableSendCode":"Não foi possível enviar o código.","codeResent":"Código reenviado","unableResend":"Não foi possível reenviar o código.","chooseSubscription":"Escolha sua assinatura","membership":"Associação","currentPlan":"Plano atual","subscriptionActivated":"Assinatura ativada","paymentVerified":"Seu pagamento foi verificado com sucesso.","paymentVerificationFailed":"Falha na verificação do pagamento.","unableStartPayment":"Não foi possível iniciar o pagamento.","paymentHours":"Pagamentos entre 5h e 11h IST.","unableCancelSubscription":"Não foi possível cancelar a assinatura.","month":"mês","current":"ATUAL","freePlan":"Plano gratuito","bronzePlan":"Plano Bronze","silverPlan":"Plano Prata","goldPlan":"Plano Ouro","onePost":"1 publicação","threePosts":"3 publicações","fivePosts":"5 publicações","unlimitedPosts":"Publicações ilimitadas","planWord":"Plano","status.active":"Ativo","status.past_due":"Atrasado","status.canceled":"Cancelado","status.incomplete":"Incompleto","status.unpaid":"Não pago","back":"Voltar","submit":"Enviar","loading":"Carregando…","noResults":"Nenhum resultado encontrado.","storyAnalytics":"Análise de stories","views":"Visualizações","uniqueViewers":"Espectadores únicos","reactions":"Reações","replies":"Respostas","completionRate":"Taxa de conclusão","viewTimeline":"Linha do tempo de visualizações","storyHighlights":"Destaques","createHighlight":"Criar destaque","yourStory":"Seu story","like":"Curtir","comment":"Comentar","addComment":"Adicionar comentário…"}),
  zh:Object.assign({...en}, {"home":"首页","search":"搜索","explore":"发现","reels":"短视频","messages":"消息","notifications":"通知","create":"创建","profile":"个人资料","settings":"设置","activity":"活动","saved":"已保存","darkMode":"深色模式","lightMode":"浅色模式","logout":"退出登录","more":"更多","subscription":"订阅","language":"语言","selectLanguage":"选择语言","mobileNumber":"手机号","saveMobile":"保存手机号","save":"保存","cancel":"取消","verify":"验证","resend":"重新发送验证码","verification":"需要验证","enterOtp":"输入6位验证码","codeSent":"验证码已发送至","expires":"验证码将在以下时间后过期","changeLanguage":"更改语言","currentLanguage":"当前语言","languageUpdated":"语言已成功更新。","validMobile":"请输入带国家代码的有效手机号。","mobileSaved":"手机号已保存","unableSaveMobile":"无法保存手机号。","sendVerification":"发送验证码","sending":"正在发送…","verificationFailed":"验证失败。","unableSendCode":"无法发送验证码。","codeResent":"验证码已重新发送","unableResend":"无法重新发送验证码。","chooseSubscription":"选择订阅","membership":"会员","currentPlan":"当前方案","subscriptionActivated":"订阅已激活","paymentVerified":"付款已成功验证。","paymentVerificationFailed":"付款验证失败。","unableStartPayment":"无法开始付款。","paymentHours":"付款时间：印度标准时间 05:00–11:00。","unableCancelSubscription":"无法取消订阅。","month":"月","current":"当前","freePlan":"免费方案","bronzePlan":"青铜方案","silverPlan":"白银方案","goldPlan":"黄金方案","onePost":"1篇帖子","threePosts":"3篇帖子","fivePosts":"5篇帖子","unlimitedPosts":"无限帖子","planWord":"方案","status.active":"有效","status.past_due":"逾期","status.canceled":"已取消","status.incomplete":"未完成","status.unpaid":"未付款","back":"返回","submit":"提交","loading":"加载中…","noResults":"未找到结果。","storyAnalytics":"快拍分析","views":"浏览量","uniqueViewers":"独立访客","reactions":"反应","replies":"回复","completionRate":"完成率","viewTimeline":"浏览时间线","storyHighlights":"精选集","createHighlight":"创建精选集","yourStory":"你的快拍","like":"赞","comment":"评论","addComment":"添加评论…"}),
  fr:Object.assign({...en}, {"home":"Accueil","search":"Rechercher","explore":"Explorer","reels":"Reels","messages":"Messages","notifications":"Notifications","create":"Créer","profile":"Profil","settings":"Paramètres","activity":"Activité","saved":"Enregistrés","darkMode":"Mode sombre","lightMode":"Mode clair","logout":"Se déconnecter","more":"Plus","subscription":"Abonnement","language":"Langue","selectLanguage":"Choisir la langue","mobileNumber":"Numéro de mobile","saveMobile":"Enregistrer le numéro","save":"Enregistrer","cancel":"Annuler","verify":"Vérifier","resend":"Renvoyer le code","verification":"Vérification requise","enterOtp":"Saisissez le code à 6 chiffres","codeSent":"Un code de vérification a été envoyé à","expires":"Le code expire dans","changeLanguage":"Changer de langue","currentLanguage":"Langue actuelle","languageUpdated":"Langue mise à jour avec succès.","validMobile":"Saisissez un numéro valide avec l'indicatif du pays.","mobileSaved":"Numéro enregistré","unableSaveMobile":"Impossible d'enregistrer le numéro.","sendVerification":"Envoyer le code","sending":"Envoi…","verificationFailed":"Échec de la vérification.","unableSendCode":"Impossible d'envoyer le code.","codeResent":"Code renvoyé","unableResend":"Impossible de renvoyer le code.","chooseSubscription":"Choisir votre abonnement","membership":"Adhésion","currentPlan":"Forfait actuel","subscriptionActivated":"Abonnement activé","paymentVerified":"Votre paiement a été vérifié avec succès.","paymentVerificationFailed":"Échec de la vérification du paiement.","unableStartPayment":"Impossible de démarrer le paiement.","paymentHours":"Paiements acceptés de 5 h à 11 h IST.","unableCancelSubscription":"Impossible d'annuler l'abonnement.","month":"mois","current":"ACTUEL","freePlan":"Forfait gratuit","bronzePlan":"Forfait Bronze","silverPlan":"Forfait Argent","goldPlan":"Forfait Or","onePost":"1 publication","threePosts":"3 publications","fivePosts":"5 publications","unlimitedPosts":"Publications illimitées","planWord":"Forfait","status.active":"Actif","status.past_due":"En retard","status.canceled":"Annulé","status.incomplete":"Incomplet","status.unpaid":"Non payé","back":"Retour","submit":"Envoyer","loading":"Chargement…","noResults":"Aucun résultat trouvé.","storyAnalytics":"Statistiques des stories","views":"Vues","uniqueViewers":"Spectateurs uniques","reactions":"Réactions","replies":"Réponses","completionRate":"Taux de complétion","viewTimeline":"Chronologie des vues","storyHighlights":"À la une","createHighlight":"Créer une rubrique","yourStory":"Votre story","like":"J’aime","comment":"Commenter","addComment":"Ajouter un commentaire…"})

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