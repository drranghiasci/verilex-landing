import { useMemo, useState } from 'react';
import type { IntakeDocument } from '../../../../../lib/intake/intakeApi';
import { createUpload, confirmUpload } from '../../../../../lib/intake/intakeApi';
import { GA_DIVORCE_CUSTODY_V1 } from '../../../../../lib/intake/schema/gaDivorceCustodyV1';
import EnumSelect from '../fields/EnumSelect';
import { formatLabel } from '../../../../../lib/intake/validation';
import type { StepProps } from './SectionStep';
import { SectionStep } from './SectionStep';
import Alert from '../../ui/Alert';
import Card from '../../ui/Card';
import Input from '../../ui/Input';

type EvidenceStepProps = Omit<StepProps, 'sectionId'> & {
  documents?: IntakeDocument[];
  token?: string;
  intakeId?: string;
  onReload?: () => void;
};

function buildDocumentTypeOptions() {
  const evidenceSection = GA_DIVORCE_CUSTODY_V1.sections.find((section) => section.id === 'evidence_documents');
  const field = evidenceSection?.fields.find((entry) => entry.key === 'document_type');
  const values = field?.enumValues ?? [];
  return values.map((value) => ({
    value,
    label: formatLabel(value),
  }));
}

export default function EvidenceDocumentsStep({
  documents,
  token,
  intakeId,
  onReload,
  payload,
  onFieldChange,
  ...props
}: EvidenceStepProps) {
  const isDisabled = Boolean(props.disabled);
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const options = useMemo(() => buildDocumentTypeOptions(), []);
  const existingDocs = documents ?? [];
  const hasUploaded = payload.uploaded === true || existingDocs.length > 0;

  const handleUpload = async (file: File) => {
    if (!token || !intakeId) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      const createResult = await createUpload({
        token,
        intakeId,
        filename: file.name,
        contentType: file.type,
        size_bytes: file.size,
      });

      const uploadResponse = await fetch(createResult.signed_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      await confirmUpload({
        token,
        intakeId,
        storage_object_path: createResult.storage_object_path,
        document_type: documentType || undefined,
        content_type: file.type,
        size_bytes: file.size,
      });

      setUploadSuccess('Document uploaded.');
      if (onReload) onReload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="step">
      <SectionStep
        sectionId="evidence_documents"
        payload={payload}
        onFieldChange={onFieldChange}
        hiddenFields={['uploaded']}
        readOnlyFields={[]}
        {...props}
      />

      <div className="step__narrative">
        <Card>
          <div className="flow__meta">
            <h3>Upload documents</h3>
            {hasUploaded && <span className="pill">Uploaded</span>}
          </div>
          <p className="muted">
            Uploading is optional. Files are stored securely and linked to this intake.
          </p>

          <EnumSelect
            label="Document type (optional)"
            value={documentType}
            options={options}
            onChange={setDocumentType}
            required={false}
            helpText="Select the closest category for this file."
            invalid={false}
            disabled={uploading || isDisabled}
          />

          <div className="field">
            <label className="field__label">Choose file</label>
            <Input
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleUpload(file);
                  event.currentTarget.value = '';
                }
              }}
              disabled={uploading || isDisabled}
            />
          </div>

          {uploading && <div className="muted">Uploading...</div>}
          {uploadError && <Alert variant="error">{uploadError}</Alert>}
          {uploadSuccess && <Alert variant="success">{uploadSuccess}</Alert>}
        </Card>
      </div>

      {existingDocs.length > 0 && (
        <Card>
          <h3>Documents received</h3>
          <p className="muted">Uploads are linked to your intake and visible to the firm after submission.</p>
        </Card>
      )}
    </div>
  );
}
