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
  es:Object.assign({...en, requiresVerificationCode:"requiere un código de verificación de un solo uso.", subscriptionActivated:"Suscripción activada", paymentVerified:"Tu pago se verificó correctamente.", paymentVerificationFailed:"No se pudo verificar el pago.", unableStartPayment:"No se pudo iniciar el pago.", paymentHours:"Pagos disponibles de 05:00 a 11:00 IST.", planRemainsActive:"Tu plan actual seguirá activo hasta el final del período de facturación.", unableCancelSubscription:"No se pudo cancelar la suscripción.", month:"mes", current:"ACTUAL",
    freePlan:"Plan gratuito", bronzePlan:"Plan Bronce", silverPlan:"Plan Plata", goldPlan:"Plan Oro",
    onePost:"1 publicación", threePosts:"3 publicaciones", fivePosts:"5 publicaciones", unlimitedPosts:"Publicaciones ilimitadas",
    planWord:"Plan", "status.active":"Activo", "status.past_due":"Vencido", "status.canceled":"Cancelado", "status.incomplete":"Incompleto", "status.unpaid":"No pagado"
  }),
  hi:Object.assign({...en, requiresVerificationCode:"requiere un código de verificación de un solo uso.", freePlan:"फ्री प्लान", bronzePlan:"ब्रॉन्ज़ प्लान", silverPlan:"सिल्वर प्लान", goldPlan:"गोल्ड प्लान", onePost:"1 पोस्ट", threePosts:"3 पोस्ट", fivePosts:"5 पोस्ट", unlimitedPosts:"अनलिमिटेड पोस्ट", planWord:"प्लान", subscriptionActivated:"सब्सक्रिप्शन सक्रिय हो गया", paymentVerified:"आपके भुगतान का सफलतापूर्वक सत्यापन हो गया है।", paymentVerificationFailed:"भुगतान सत्यापन विफल रहा।", unableStartPayment:"भुगतान शुरू नहीं किया जा सका।", paymentHours:"भुगतान समय: सुबह 5:00 से 11:00 IST।", planRemainsActive:"आपका वर्तमान प्लान बिलिंग अवधि समाप्त होने तक सक्रिय रहेगा।", unableCancelSubscription:"सब्सक्रिप्शन रद्द नहीं किया जा सका।", month:"महीना", current:"वर्तमान", "status.active":"सक्रिय", "status.past_due":"बकाया", "status.canceled":"रद्द", "status.incomplete":"अपूर्ण", "status.unpaid":"भुगतान नहीं हुआ"}),
  pt:Object.assign({...en, requiresVerificationCode:"requer um código de verificação de uso único.", freePlan:"Plano gratuito", bronzePlan:"Plano Bronze", silverPlan:"Plano Silver", goldPlan:"Plano Gold", onePost:"1 publicação", threePosts:"3 publicações", fivePosts:"5 publicações", unlimitedPosts:"Publicações ilimitadas", planWord:"Plano", subscriptionActivated:"Assinatura ativada", paymentVerified:"Seu pagamento foi verificado com sucesso.", paymentVerificationFailed:"Falha na verificação do pagamento.", unableStartPayment:"Não foi possível iniciar o pagamento.", paymentHours:"Pagamentos disponíveis das 05:00 às 11:00 IST.", planRemainsActive:"Seu plano atual permanece ativo até o fim do período de cobrança.", unableCancelSubscription:"Não foi possível cancelar a assinatura.", month:"mês", current:"ATUAL", "status.active":"Ativo", "status.past_due":"Em atraso", "status.canceled":"Cancelado", "status.incomplete":"Incompleto", "status.unpaid":"Não pago"}),
  zh:Object.assign({...en, requiresVerificationCode:"需要一次性验证码。", freePlan:"免费方案", bronzePlan:"青铜方案", silverPlan:"白银方案", goldPlan:"黄金方案", onePost:"1篇帖子", threePosts:"3篇帖子", fivePosts:"5篇帖子", unlimitedPosts:"无限帖子", planWord:"方案", subscriptionActivated:"订阅已激活", paymentVerified:"您的付款已成功验证。", paymentVerificationFailed:"付款验证失败。", unableStartPayment:"无法开始付款。", paymentHours:"付款时间：印度标准时间 05:00–11:00。", planRemainsActive:"您的当前方案将在计费周期结束前保持有效。", unableCancelSubscription:"无法取消订阅。", month:"月", current:"当前", "status.active":"有效", "status.past_due":"逾期", "status.canceled":"已取消", "status.incomplete":"未完成", "status.unpaid":"未付款"}),
  fr:Object.assign({...en, requiresVerificationCode:"nécessite un code de vérification à usage unique.", freePlan:"Forfait gratuit", bronzePlan:"Forfait Bronze", silverPlan:"Forfait Argent", goldPlan:"Forfait Or", onePost:"1 publication", threePosts:"3 publications", fivePosts:"5 publications", unlimitedPosts:"Publications illimitées", planWord:"Forfait", subscriptionActivated:"Abonnement activé", paymentVerified:"Votre paiement a été vérifié avec succès.", paymentVerificationFailed:"Échec de la vérification du paiement.", unableStartPayment:"Impossible de démarrer le paiement.", paymentHours:"Paiements disponibles de 05:00 à 11:00 IST.", planRemainsActive:"Votre forfait actuel reste actif jusqu'à la fin de la période de facturation.", unableCancelSubscription:"Impossible d'annuler l'abonnement.", month:"mois", current:"ACTUEL", "status.active":"Actif", "status.past_due":"En retard", "status.canceled":"Annulé", "status.incomplete":"Incomplet", "status.unpaid":"Non payé"})

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