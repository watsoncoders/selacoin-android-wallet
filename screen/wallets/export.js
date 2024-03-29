import React, { useState, useCallback, useContext, useRef } from 'react';
import { useWindowDimensions, InteractionManager, ScrollView, ActivityIndicator, StatusBar, View, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme, useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';

import { BlueSpacing20, SafeBlueArea, BlueText, BlueCopyTextToClipboard, BlueCard } from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import Privacy from '../../blue_modules/Privacy';
import Biometric from '../../class/biometrics';
import { LegacyWallet, LightningCustodianWallet, SegwitBech32Wallet, SegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollViewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  activeQrcode: { borderWidth: 6, borderRadius: 8, borderColor: '#FFFFFF' },
  type: {
    fontSize: 17,
    fontWeight: '700',
  },
  secret: {
    alignItems: 'center',
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 24,
  },
});

const WalletExport = () => {
  const { wallets, saveToDisk } = useContext(BlueStorageContext);
  const { walletID } = useRoute().params;
  const wallet = useRef(wallets.find(w => w.getID() === walletID));
  const [isLoading, setIsLoading] = useState(true);
  const { goBack } = useNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const stylesHook = {
    ...styles,
    loading: {
      ...styles.loading,
      backgroundColor: colors.elevated,
    },
    root: {
      backgroundColor: colors.elevated,
    },
    type: { ...styles.type, color: colors.foregroundColor },
    secret: { ...styles.secret, color: colors.foregroundColor },
    warning: { ...styles.secret, color: colors.failedColor },
  };

  useFocusEffect(
    useCallback(() => {
      Privacy.enableBlur();
      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          const isBiometricsEnabled = await Biometric.isBiometricUseCapableAndEnabled();

          if (isBiometricsEnabled) {
            if (!(await Biometric.unlockWithBiometrics())) {
              return goBack();
            }
          }
          if (!wallet.current.getUserHasSavedExport()) {
            wallet.current.setUserHasSavedExport(true);
            saveToDisk();
          }
          setIsLoading(false);
        }
      });
      return () => {
        task.cancel();
        Privacy.disableBlur();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [goBack, walletID]),
  );

  return isLoading && wallet ? (
    <View style={stylesHook.loading}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={stylesHook.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollViewContent} testID="WalletExportScroll">
        <View>
          <BlueText style={stylesHook.type}>{wallet.current.typeReadable}</BlueText>
        </View>

        {(() => {
          if ([LegacyWallet.type, SegwitBech32Wallet.type, SegwitP2SHWallet.type].includes(wallet.current.type)) {
            return (
              <BlueCard>
                <BlueText>{wallet.current.getAddress()}</BlueText>
              </BlueCard>
            );
          }
        })()}
        <BlueSpacing20 />
        <View style={styles.activeQrcode}>
          <QRCode
            value={wallet.current.getSecret()}
            logo={require('../../img/qr-code.png')}
            size={height > width ? width - 40 : width / 2}
            logoSize={70}
            color="#000000"
            logoBackgroundColor={colors.brandingColor}
            backgroundColor="#FFFFFF"
            ecl="H"
          />
        </View>
        {wallet.type !== WatchOnlyWallet.type && <BlueText style={stylesHook.warning}>{loc.wallets.warning_do_not_disclose}</BlueText>}
        <BlueSpacing20 />
        {wallet.current.type === LightningCustodianWallet.type || wallet.current.type === WatchOnlyWallet.type ? (
          <BlueCopyTextToClipboard text={wallet.current.getSecret()} />
        ) : (
          <BlueText style={stylesHook.secret} testID="Secret">
            {wallet.current.getSecret()}
          </BlueText>
        )}
      </ScrollView>
    </SafeBlueArea>
  );
};

WalletExport.navigationOptions = navigationStyle(
  {
    closeButton: true,
    headerLeft: null,
  },
  opts => ({ ...opts, title: loc.wallets.export_title }),
);

export default WalletExport;
