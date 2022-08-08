import * as React from 'react';
import { Checkbox, FormGroup, Tooltip } from '@patternfly/react-core';
import { useField, useFormikContext } from 'formik';
import {
  getFieldId,
  ClusterCreateParams,
  HelperText,
  PopoverIcon,
  CpuArchitecture,
  OpenshiftVersionOptionType,
} from '../../../common';
import {
  FeatureSupportLevelBadge,
  useFeatureSupportLevel,
} from '../../../common/components/featureSupportLevels';
import { isMultiArchitecture } from '../../../common/selectors/clusterSelectors';

const getLabel = (openshiftVersion: string) => {
  return (
    <>
      Use multiarch (ARM, ppc64le, or s390x) CPU architecture{' '}
      <PopoverIcon
        noVerticalAlign
        bodyContent={
          <p>
            Check this option if you want to use multiarch (s390x,ppc64le, or ARM) CPU architecture instead of the default
            x86 CPU architecture. Please note that some features will not be available.
          </p>
        }
      />
      <FeatureSupportLevelBadge
        featureId="MULTIARCH"
        openshiftVersion={openshiftVersion}
      />
    </>
  );
};

type MultiarchCheckboxProps = { versions: OpenshiftVersionOptionType[] };

const MultiarchCheckbox: React.FC<MultiarchCheckboxProps> = ({ versions }) => {
  const {
    values: { openshiftVersion },
  } = useFormikContext<ClusterCreateParams>();
  const [{ name, value }, , { setValue }] = useField<CpuArchitecture>('cpuArchitecture');
  const featureSupportLevelContext = useFeatureSupportLevel();
  const isSupportedVersionAvailable = !!versions.find((version) =>
    featureSupportLevelContext.isFeatureSupported(version.value, 'MULTIARCH'),
  );
  const prevVersionRef = React.useRef(openshiftVersion);
  const fieldId = getFieldId(name, 'input');
  const onChanged = React.useCallback(
    (checked: boolean) => setValue(checked ? CpuArchitecture.multiarch : CpuArchitecture.x86),
    [setValue],
  );

  React.useEffect(() => {
    if (
      prevVersionRef.current !== openshiftVersion &&
      !featureSupportLevelContext.isFeatureSupported(openshiftVersion, 'MULTIARCH')
    ) {
      //invoke updating cpu architecture value only if the version changed to not be in danger of touching existing clusters
      onChanged(false);
    }
    prevVersionRef.current = openshiftVersion;
  }, [openshiftVersion, onChanged, featureSupportLevelContext]);
  if (!isSupportedVersionAvailable) {
    return null;
  }
  const disabledReason = featureSupportLevelContext.getFeatureDisabledReason(
    openshiftVersion,
    'MULTIARCH',
  );
  return (
    <FormGroup isInline fieldId={fieldId}>
      <Tooltip hidden={!disabledReason} content={disabledReason}>
        <Checkbox
          id={fieldId}
          name={name}
          isDisabled={featureSupportLevelContext.isFeatureDisabled(
            openshiftVersion,
            'MULTIARCH',
          )}
          label={getLabel(openshiftVersion)}
          aria-describedby={`${fieldId}-helper`}
          description={
            <HelperText fieldId={fieldId}>
              Make sure all the hosts are using the same CPU architecture.
            </HelperText>
          }
          isChecked={isMultiArchitecture({ cpuArchitecture: value })}
          onChange={onChanged}
          className="with-tooltip"
        />
      </Tooltip>
    </FormGroup>
  );
};

export default MultiarchCheckbox;
