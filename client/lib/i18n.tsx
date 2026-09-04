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

const translations: Record<LanguageCode, Dictionary> = {
  en: {
    home: "Home", search: "Search", messages: "Messages", profile: "Profile", settings: "Settings",
    language: "Language", selectLanguage: "Select language", mobileNumber: "Mobile number", saveMobile: "Save mobile number",
    save: "Save", cancel: "Cancel", verify: "Verify", resend: "Resend code", verification: "Verification required",
    enterOtp: "Enter the 6-digit code", codeSent: "A verification code was sent to", expires: "Code expires in",
    changeLanguage: "Change language", currentLanguage: "Current language", addMobile: "Add your mobile number to use this language.",
    languageUpdated: "Language updated successfully.",
  },
  es: {
    home: "Inicio", search: "Buscar", messages: "Mensajes", profile: "Perfil", settings: "Configuración",
    language: "Idioma", selectLanguage: "Seleccionar idioma", mobileNumber: "Número de móvil", saveMobile: "Guardar número",
    save: "Guardar", cancel: "Cancelar", verify: "Verificar", resend: "Reenviar código", verification: "Verificación requerida",
    enterOtp: "Introduce el código de 6 dígitos", codeSent: "Se envió un código de verificación a", expires: "El código caduca en",
    changeLanguage: "Cambiar idioma", currentLanguage: "Idioma actual", addMobile: "Añade tu número móvil para usar este idioma.",
    languageUpdated: "Idioma actualizado correctamente.",
  },
  hi: {
    home: "होम", search: "खोजें", messages: "संदेश", profile: "प्रोफ़ाइल", settings: "सेटिंग्स",
    language: "भाषा", selectLanguage: "भाषा चुनें", mobileNumber: "मोबाइल नंबर", saveMobile: "मोबाइल नंबर सहेजें",
    save: "सहेजें", cancel: "रद्द करें", verify: "सत्यापित करें", resend: "कोड फिर भेजें", verification: "सत्यापन आवश्यक है",
    enterOtp: "6 अंकों का कोड दर्ज करें", codeSent: "सत्यापन कोड भेजा गया है", expires: "कोड समाप्त होगा",
    changeLanguage: "भाषा बदलें", currentLanguage: "वर्तमान भाषा", addMobile: "इस भाषा का उपयोग करने के लिए मोबाइल नंबर जोड़ें।",
    languageUpdated: "भाषा सफलतापूर्वक अपडेट हुई।",
  },
  pt: {
    home: "Início", search: "Pesquisar", messages: "Mensagens", profile: "Perfil", settings: "Configurações",
    language: "Idioma", selectLanguage: "Selecionar idioma", mobileNumber: "Número de celular", saveMobile: "Salvar número",
    save: "Salvar", cancel: "Cancelar", verify: "Verificar", resend: "Reenviar código", verification: "Verificação necessária",
    enterOtp: "Digite o código de 6 dígitos", codeSent: "Um código de verificação foi enviado para", expires: "O código expira em",
    changeLanguage: "Alterar idioma", currentLanguage: "Idioma atual", addMobile: "Adicione seu número de celular para usar este idioma.",
    languageUpdated: "Idioma atualizado com sucesso.",
  },
  zh: {
    home: "主页", search: "搜索", messages: "消息", profile: "个人资料", settings: "设置",
    language: "语言", selectLanguage: "选择语言", mobileNumber: "手机号码", saveMobile: "保存手机号码",
    save: "保存", cancel: "取消", verify: "验证", resend: "重新发送验证码", verification: "需要验证",
    enterOtp: "输入6位验证码", codeSent: "验证码已发送至", expires: "验证码将在以下时间后过期",
    changeLanguage: "更改语言", currentLanguage: "当前语言", addMobile: "请添加手机号码以使用此语言。",
    languageUpdated: "语言更新成功。",
  },
  fr: {
    home: "Accueil", search: "Rechercher", messages: "Messages", profile: "Profil", settings: "Paramètres",
    language: "Langue", selectLanguage: "Sélectionner la langue", mobileNumber: "Numéro de mobile", saveMobile: "Enregistrer le numéro",
    save: "Enregistrer", cancel: "Annuler", verify: "Vérifier", resend: "Renvoyer le code", verification: "Vérification requise",
    enterOtp: "Saisissez le code à 6 chiffres", codeSent: "Un code de vérification a été envoyé à", expires: "Le code expire dans",
    changeLanguage: "Changer de langue", currentLanguage: "Langue actuelle", addMobile: "Ajoutez votre numéro mobile pour utiliser cette langue.",
    languageUpdated: "Langue mise à jour avec succès.",
  },
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

  const setLanguage = (next: LanguageCode) => {
    setLanguageState(next);
    localStorage.setItem("language", next);
    if (user) {
      setUser({ ...user, language: next });
      localStorage.setItem("user", JSON.stringify({ ...user, language: next }));
    }
  };

  const value = useMemo(() => ({ language, setLanguage, t: (key: string) => translations[language][key] || translations.en[key] || key }), [language, user]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LanguageProvider");
  return context;
};