import React from 'react';
import * as Yup from 'yup';
import {
  Button,
  ButtonVariant,
  ButtonType,
  Form,
  ModalBoxBody,
  ModalBoxFooter,
  AlertVariant,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';

import { Formik } from 'formik';
import { Host, Inventory } from '../../api';
import {
  richNameValidationSchema,
  RichInputField,
  StaticTextField,
  hostnameValidationMessages,
  getRichTextValidation,
} from '../ui';
import { canHostnameBeChanged } from './utils';
import GridGap from '../ui/GridGap';
import { EditHostFormValues } from './types';
import { useTranslation } from '../../hooks/use-translation-wrapper';
import { TFunction } from 'i18next';

export type EditHostFormProps = {
  host: Host;
  inventory: Inventory;
  usedHostnames: string[] | undefined;
  onCancel: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (values: EditHostFormValues) => Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFormSaveError?: (e: any) => void | string;
};

const validationSchema = (
  t: TFunction,
  initialValues: EditHostFormValues,
  usedHostnames: string[] = [],
) =>
  Yup.object().shape({
    hostname: richNameValidationSchema(t, usedHostnames, initialValues.hostname),
  });

const EditHostForm: React.FC<EditHostFormProps> = ({
  host,
  inventory,
  usedHostnames,
  onCancel,
  onSave,
  onFormSaveError,
}) => {
  const hostnameInputRef = React.useRef<HTMLInputElement>();
  React.useEffect(() => {
    hostnameInputRef.current?.focus();
    hostnameInputRef.current?.select();
  }, []);

  const { requestedHostname } = host;
  const { hostname } = inventory;

  const initialValues: EditHostFormValues = {
    hostId: host.id,
    hostname: requestedHostname || '',
  };
  const { t } = useTranslation();
  return (
    <Formik
      validateOnMount
      initialValues={initialValues}
      initialStatus={{ error: null }}
      validate={getRichTextValidation(validationSchema(t, initialValues, usedHostnames))}
      onSubmit={async (values, formikActions) => {
        if (values.hostname === initialValues.hostname) {
          // no change to save
          onCancel();
          return;
        }
        try {
          await onSave(values);
          onCancel();
        } catch (e) {
          const message = (onFormSaveError && onFormSaveError(e)) || t('ai:Host update failed.');
          formikActions.setStatus({
            error: {
              title: t('ai:Failed to update host'),
              message,
            },
          });
        }
      }}
    >
      {({ handleSubmit, status, setStatus, isSubmitting, isValid, dirty }) => (
        <Form onSubmit={handleSubmit}>
          <ModalBoxBody>
            <GridGap>
              {status.error && (
                <Alert
                  variant={AlertVariant.danger}
                  title={status.error.title}
                  actionClose={
                    <AlertActionCloseButton onClose={() => setStatus({ error: null })} />
                  }
                  isInline
                >
                  {status.error.message}
                </Alert>
              )}
              <Alert
                variant={AlertVariant.info}
                title={t('ai:This name will replace the original discovered hostname.')}
                isInline
              />
              <StaticTextField name="discoveredHostname" label="Discovered hostname">
                {hostname || ''}
              </StaticTextField>
              <RichInputField
                label={t('ai:New hostname')}
                name="hostname"
                ref={hostnameInputRef}
                isRequired
                isDisabled={!canHostnameBeChanged(host.status)}
                richValidationMessages={hostnameValidationMessages(t)}
              />
            </GridGap>
          </ModalBoxBody>
          <ModalBoxFooter>
            <Button
              key="submit"
              type={ButtonType.submit}
              isDisabled={isSubmitting || !isValid || !dirty}
            >
              {t('ai:Change')}
            </Button>
            <Button key="cancel" variant={ButtonVariant.link} onClick={onCancel}>
              {t('ai:Cancel')}
            </Button>
          </ModalBoxFooter>
        </Form>
      )}
    </Formik>
  );
};

export default EditHostForm;
