import React, { PropsWithChildren } from 'react';
import {
  FeatureSupportLevelsMap,
  FeatureIdToSupportLevel,
  FeatureId,
  SupportLevel,
  FeatureSupportLevelContextProvider,
  FeatureSupportLevelData,
} from '../../../common';
import { ClusterImageSetK8sResource } from '../../types';
import { featureSupportLevelsACM } from '../../config/constants';
import { getFeatureDisabledReason, isFeatureSupported } from './featureStateUtils';
import { getVersionFromReleaseImage } from '../helpers';

export type ACMFeatureSupportLevelProvider = PropsWithChildren<{
  clusterImages: ClusterImageSetK8sResource[];
  isEditClusterFlow?: boolean;
}>;
const getFeatureSupportLevelsMap = (): FeatureSupportLevelsMap => {
  try {
    const featureSupportLevelsMap: FeatureSupportLevelsMap = {};
    featureSupportLevelsACM.supportLevels.forEach((feature) => {
      const featureIdParams = {};
      const featureProps = feature.features;
      featureProps.forEach((ops: { featureId: string | number; supportLevel: string }) => {
        featureIdParams[ops.featureId] = ops.supportLevel;
      });
      featureSupportLevelsMap[feature.openshiftVersion] = featureIdParams;
    });
    return featureSupportLevelsMap;
  } catch (err) {
    console.error(err);
    return {};
  }
};

export const ACMFeatureSupportLevelProvider: React.FC<ACMFeatureSupportLevelProvider> = ({
  children,
  clusterImages,
  isEditClusterFlow,
}) => {
  const supportLevelData: FeatureSupportLevelsMap = React.useMemo<FeatureSupportLevelsMap>(() => {
    return getFeatureSupportLevelsMap();
  }, []);

  const getMajorMinorVersion = (version = '') => {
    const match = /[0-9].[0-9][0-9]?/g.exec(version);
    return match?.[0] || '';
  };

  const getNormalizedVersion = React.useCallback(
    (versionName: string) => {
      const clusterImage = clusterImages.filter(
        (clusterImageSet) => clusterImageSet.metadata?.name === versionName,
      );
      const version = getVersionFromReleaseImage(clusterImage[0]?.spec?.releaseImage);
      return getMajorMinorVersion(version);
    },
    [clusterImages],
  );

  const getVersionSupportLevelsMap: FeatureSupportLevelData['getVersionSupportLevelsMap'] =
    React.useCallback(
      (versionName: string): FeatureIdToSupportLevel | undefined => {
        const normalized = getNormalizedVersion(versionName);
        return normalized
          ? supportLevelData[normalized]
          : {
              /* empty FeatureIdToSupportLevel */
            };
      },
      [supportLevelData, getNormalizedVersion],
    );

  // TODO(mlibra): Following callbacks can be reused with the OCM flow, just based on providing an application-specific map
  const getFeatureSupportLevel: FeatureSupportLevelData['getFeatureSupportLevel'] =
    React.useCallback(
      (versionName: string, featureId: FeatureId): SupportLevel | undefined => {
        const versionSupportLevelData = getVersionSupportLevelsMap(versionName);
        return versionSupportLevelData ? versionSupportLevelData[featureId] : undefined;
      },
      [getVersionSupportLevelsMap],
    );

  const isFeatureSupportedCallback = React.useCallback(
    (versionName: string, featureId: FeatureId) => {
      const supportLevel = getFeatureSupportLevel(versionName, featureId);
      return isFeatureSupported(supportLevel);
    },
    [getFeatureSupportLevel],
  );

  const getDisabledReasonCallback = React.useCallback(
    (versionName: string, featureId: FeatureId) => {
      const isSupported = isFeatureSupportedCallback(versionName, featureId);
      return getFeatureDisabledReason(featureId, undefined, isSupported);
    },
    [isFeatureSupportedCallback],
  );

  const isFeatureDisabled: FeatureSupportLevelData['isFeatureDisabled'] = React.useCallback(
    (_version: string, featureId: FeatureId) => {
      if (isEditClusterFlow) {
        if (featureId === 'SNO') {
          return true;
        }
      }
      return false;
    },
    [isEditClusterFlow],
  );

  const providerValue = React.useMemo<FeatureSupportLevelData>(() => {
    return {
      getVersionSupportLevelsMap,
      getFeatureSupportLevel,
      isFeatureDisabled,
      getFeatureDisabledReason: getDisabledReasonCallback,
      isFeatureSupported: isFeatureSupportedCallback,
    };
  }, [
    getVersionSupportLevelsMap,
    getFeatureSupportLevel,
    isFeatureDisabled,
    getDisabledReasonCallback,
    isFeatureSupportedCallback,
  ]);

  return (
    <FeatureSupportLevelContextProvider value={providerValue}>
      {children}
    </FeatureSupportLevelContextProvider>
  );
};

export default ACMFeatureSupportLevelProvider;
