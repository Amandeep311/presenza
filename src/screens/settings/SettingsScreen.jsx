// src/screens/settings/SettingsScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {
  Sun,
  Moon,
  Smartphone,
  Globe,
  LogOut,
  Info,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { logout } from '../../store/actions/authActions';
import MainLayout from '../../components/layout/MainLayout';
import { Fonts } from '../../utils/GlobalText';
import DeviceInfo from 'react-native-device-info';
import { ChevronLeft } from 'lucide-react-native';
import { Platform } from 'react-native';

const SettingsScreen = ({ route, navigation }) => {
  const fromAuth = route?.params?.fromAuth;
  const dispatch = useDispatch();
  const { theme, themeMode, setTheme } = useTheme();
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  const C = theme.colors;
  const appVersion = DeviceInfo.getVersion();
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // ── safe helpers so undefined keys never crash the app ──────────────────
  const s = t?.settings ?? {};
  const a = t?.alerts ?? {};
  const b = t?.buttons ?? {};
  const l = t?.leave ?? {}; // for department, employeeCode etc

  // SettingsScreen.jsx
  const handleLogout = () => {
    Alert.alert(
      s.logout ?? 'Logout',
      a.logoutConfirm ?? 'Are you sure you want to logout?',
      [
        { text: b.cancel ?? 'Cancel', style: 'cancel' },
        {
          text: b.logout ?? 'Logout',
          onPress: async () => {
            await dispatch(logout());
          },
          style: 'destructive',
        },
      ],
      { cancelable: true },
    );
  };

  const themeOptions = [
    { key: 'system', label: s.system ?? 'System', icon: Smartphone },
    { key: 'dark', label: s.dark ?? 'Dark', icon: Moon },
    { key: 'light', label: s.light ?? 'Light', icon: Sun },
  ];

  const currentLangObj = availableLanguages?.find(l => l.code === language);

  // ── sub-components ───────────────────────────────────────────────────────
  const SectionHeader = ({ label }) => (
    <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>
      {label}
    </Text>
  );

  const SettingRow = ({
    icon: Icon,
    iconColor,
    label,
    desc,
    value,
    onPress,
    hideChevron,
  }) => (
    <TouchableOpacity
      style={[
        styles.row,
        { backgroundColor: C.surface, borderColor: C.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: (iconColor || C.primary) + '20' },
        ]}
      >
        <Icon size={wp('4.5%')} color={iconColor || C.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: C.textPrimary }]}>{label}</Text>
        {desc ? (
          <Text style={[styles.rowDesc, { color: C.textSecondary }]}>
            {desc}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={[styles.rowValue, { color: C.textSecondary }]}>
          {value}
        </Text>
      ) : null}
      {!hideChevron && <ChevronRight size={wp('4%')} color={C.textSecondary} />}
    </TouchableOpacity>
  );

  const currentThemeLabel =
    themeMode === 'dark'
      ? s.dark ?? 'Dark'
      : themeMode === 'light'
      ? s.light ?? 'Light'
      : s.system ?? 'System';

  // ── render ───────────────────────────────────────────────────────────────
  return fromAuth ? (
    <View style={{ flex: 1, backgroundColor: C.background }}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: C.background,
            borderBottomColor: C.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            {
              backgroundColor: C.surface,
              borderColor: C.border,
            },
          ]}
        >
          <ChevronLeft size={wp('5%')} color={C.textPrimary} />
        </TouchableOpacity>

        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: C.textPrimary }]}>
            {s.title ?? 'Settings'}
          </Text>
        </View>
      </View>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.background} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Appearance ── */}
        <SectionHeader label={s.appearance ?? 'Appearance'} />

        <SettingRow
          icon={
            themeMode === 'dark'
              ? Moon
              : themeMode === 'light'
              ? Sun
              : Smartphone
          }
          label={s.themeMode ?? 'Theme Mode'}
          desc={s.themeDesc ?? 'Choose your preferred theme'}
          value={currentThemeLabel}
          onPress={() => setThemeModalVisible(true)}
        />

        {/* ── Preferences ── */}
        {/* <SectionHeader label={s.preferences ?? 'Preferences'} />

        <SettingRow
          icon={Globe}
          label={s.language ?? 'Language'}
          desc={s.languageDesc ?? 'Select your preferred language'}
          value={
            currentLangObj
              ? `${currentLangObj.flag ?? ''} ${
                  currentLangObj.nativeName ?? currentLangObj.name
                }`
              : 'EN'
          }
          onPress={() => setLangModalVisible(true)}
        /> */}

        {/* ── Account ── */}
        {/* <SectionHeader label={s.account ?? 'Account'} />

        <SettingRow
          icon={LogOut}
          iconColor={C.error}
          label={s.logout ?? 'Logout'}
          desc={s.logoutDesc ?? 'Sign out from your account'}
          onPress={handleLogout}
          hideChevron={false}
        /> */}

        {/* ── App Info ── */}
        <SectionHeader label={s.appInfo ?? 'App Info'} />

        <View
          style={[
            styles.infoCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Info size={wp('4%')} color={C.textSecondary} />
          <Text style={[styles.infoText, { color: C.textSecondary }]}>
            Presenza • {s.version ?? 'Version'} {appVersion}
          </Text>
        </View>
      </ScrollView>
      {/* Theme Modal and Language Modal same as before */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: C.surfaceSolid ?? C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              {s.theme ?? 'Theme'}
            </Text>

            {themeOptions.map(opt => {
              const Icon = opt.icon;
              const active = themeMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.modalOption,
                    { borderColor: active ? C.primary : C.border },
                    active && { backgroundColor: C.primary + '18' },
                  ]}
                  onPress={() => {
                    setTheme(opt.key);
                    setThemeModalVisible(false);
                  }}
                >
                  <Icon
                    size={wp('4.5%')}
                    color={active ? C.primary : C.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: active ? C.primary : C.textPrimary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active && (
                    <Check
                      size={wp('4%')}
                      color={C.primary}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: C.surfaceSolid ?? C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              {s.language ?? 'Language'}
            </Text>

            <ScrollView
              style={styles.langScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {(availableLanguages ?? []).map(lang => {
                const active = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.modalOption,
                      { borderColor: active ? C.primary : C.border },
                      active && { backgroundColor: C.primary + '18' },
                    ]}
                    onPress={() => {
                      setLanguage(lang.code);
                      setLangModalVisible(false);
                    }}
                  >
                    <Text style={styles.flagText}>{lang.flag ?? '🌐'}</Text>
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: active ? C.primary : C.textPrimary },
                      ]}
                    >
                      {lang.nativeName ?? lang.name}
                    </Text>
                    {active && (
                      <Check
                        size={wp('4%')}
                        color={C.primary}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  ) : (
    <MainLayout title={s.title ?? 'Settings'} showBack>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── Appearance ── */}
        <SectionHeader label={s.appearance ?? 'Appearance'} />

        <SettingRow
          icon={
            themeMode === 'dark'
              ? Moon
              : themeMode === 'light'
              ? Sun
              : Smartphone
          }
          label={s.themeMode ?? 'Theme Mode'}
          desc={s.themeDesc ?? 'Choose your preferred theme'}
          value={currentThemeLabel}
          onPress={() => setThemeModalVisible(true)}
        />

        {/* ── Preferences ── */}
        {/* <SectionHeader label={s.preferences ?? 'Preferences'} />

        <SettingRow
          icon={Globe}
          label={s.language ?? 'Language'}
          desc={s.languageDesc ?? 'Select your preferred language'}
          value={
            currentLangObj
              ? `${currentLangObj.flag ?? ''} ${
                  currentLangObj.nativeName ?? currentLangObj.name
                }`
              : 'EN'
          }
          onPress={() => setLangModalVisible(true)}
        /> */}

        {/* ── Account ── */}
        <SectionHeader label={s.account ?? 'Account'} />

        <SettingRow
          icon={LogOut}
          iconColor={C.error}
          label={s.logout ?? 'Logout'}
          desc={s.logoutDesc ?? 'Sign out from your account'}
          onPress={handleLogout}
          hideChevron={false}
        />

        {/* ── App Info ── */}
        <SectionHeader label={s.appInfo ?? 'App Info'} />

        <View
          style={[
            styles.infoCard,
            { backgroundColor: C.surface, borderColor: C.border },
          ]}
        >
          <Info size={wp('4%')} color={C.textSecondary} />
          <Text style={[styles.infoText, { color: C.textSecondary }]}>
            Presenza • {s.version ?? 'Version'} {appVersion}
          </Text>
        </View>
      </ScrollView>

      {/* Theme Modal - same as above */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}
          activeOpacity={1}
          onPress={() => setThemeModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: C.surfaceSolid ?? C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              {s.theme ?? 'Theme'}
            </Text>

            {themeOptions.map(opt => {
              const Icon = opt.icon;
              const active = themeMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.modalOption,
                    { borderColor: active ? C.primary : C.border },
                    active && { backgroundColor: C.primary + '18' },
                  ]}
                  onPress={() => {
                    setTheme(opt.key);
                    setThemeModalVisible(false);
                  }}
                >
                  <Icon
                    size={wp('4.5%')}
                    color={active ? C.primary : C.textSecondary}
                  />
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: active ? C.primary : C.textPrimary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active && (
                    <Check
                      size={wp('4%')}
                      color={C.primary}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Language Modal - same as above */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: C.overlayBg }]}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: C.surfaceSolid ?? C.surface,
                borderColor: C.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: C.textPrimary }]}>
              {s.language ?? 'Language'}
            </Text>

            <ScrollView
              style={styles.langScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {(availableLanguages ?? []).map(lang => {
                const active = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.modalOption,
                      { borderColor: active ? C.primary : C.border },
                      active && { backgroundColor: C.primary + '18' },
                    ]}
                    onPress={() => {
                      setLanguage(lang.code);
                      setLangModalVisible(false);
                    }}
                  >
                    <Text style={styles.flagText}>{lang.flag ?? '🌐'}</Text>
                    <Text
                      style={[
                        styles.modalOptionText,
                        { color: active ? C.primary : C.textPrimary },
                      ]}
                    >
                      {lang.nativeName ?? lang.name}
                    </Text>
                    {active && (
                      <Check
                        size={wp('4%')}
                        color={C.primary}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </MainLayout>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  scroll: {
    paddingTop: hp('1%'),
    paddingBottom: hp('6%'),
  },
  sectionHeader: {
    fontSize: wp('2.8%'),
    fontFamily: Fonts.medium,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: hp('2.5%'),
    marginBottom: hp('0.8%'),
    paddingHorizontal: wp('5%'),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp('4%'),
    marginBottom: hp('0.8%'),
    borderRadius: wp('3.5%'),
    borderWidth: 1,
    padding: wp('4%'),
    gap: wp('3%'),
  },
  rowIcon: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('2.5%'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: wp('3.5%'), fontFamily: Fonts.medium },
  rowDesc: { fontSize: wp('2.8%'), fontFamily: Fonts.regular, marginTop: 2 },
  rowValue: {
    flex: 1 / 2,
    fontSize: wp('3%'),
    fontFamily: Fonts.regular,
    marginRight: wp('1%'),
    lineHeight: hp('2%'),
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('3%'),
    marginHorizontal: wp('4%'),
    padding: wp('4%'),
    borderRadius: wp('3.5%'),
    borderWidth: 1,
  },
  infoText: { fontSize: wp('3%'), fontFamily: Fonts.regular },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
  },
  modalCard: {
    width: '100%',
    maxHeight: hp('70%'),
    borderRadius: wp('5%'),
    padding: wp('5%'),
    borderWidth: 1,
    gap: hp('1%'),
  },
  langScroll: {
    maxHeight: hp('55%'),
  },
  modalTitle: {
    fontSize: wp('4.5%'),
    fontFamily: Fonts.bold,
    marginBottom: hp('1%'),
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp('3%'),
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1.5%'),
    borderRadius: wp('3%'),
    borderWidth: 1,
    marginBottom: hp('0.6%'),
  },
  modalOptionText: {
    fontSize: wp('3.8%'),
    fontFamily: Fonts.medium,
    flex: 1,
  },
  flagText: { fontSize: wp('5%') },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('4%'),
    paddingTop: Platform.OS === 'ios' ? hp('6%') : hp('5%'),
    paddingBottom: hp('2%'),
    borderBottomWidth: 1,
  },
  backBtn: {
    width: wp('9%'),
    height: wp('9%'),
    borderRadius: wp('2.5%'),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    flex: 1,
    paddingLeft: wp('3%'),
  },
  pageTitle: {
    fontSize: wp('5%'),
    fontFamily: Fonts.bold,
    letterSpacing: -0.3,
  },
});

export default SettingsScreen;
