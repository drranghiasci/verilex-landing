
import { useState } from 'react';
import { createUpload, confirmUpload } from '../../../../../lib/intake/intakeApi';
import Card from '../../ui/Card';
import Input from '../../ui/Input';
import Button from '../../ui/Button';
import Alert from '../../ui/Alert';

type DocumentRequestCardProps = {
    token: string;
    intakeId: string | null;
    documentType: string;
    reason: string;
    onUploadComplete?: () => void;
};

export default function DocumentRequestCard({
    token,
    intakeId,
    documentType,
    reason,
    onUploadComplete
}: DocumentRequestCardProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

    const handleUpload = async (file: File) => {
        if (!token || !intakeId) {
            setUploadError('Missing intake context');
            return;
        }

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
                document_type: documentType,
                content_type: file.type,
                size_bytes: file.size,
            });

            setUploadSuccess('Document uploaded successfully.');
            if (onUploadComplete) onUploadComplete();

        } catch (err) {
            console.error(err);
            setUploadError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    if (uploadSuccess) {
        return (
            <Card className="doc-card success">
                <div className="doc-card__header">
                    <span className="icon">✓</span>
                    <div>
                        <strong>{reason}</strong>
                        <div className="sub">Received: {documentType}</div>
                    </div>
                </div>
                <style jsx>{`
                    .doc-card { padding: 12px; border-left: 3px solid var(--success); }
                    .doc-card__header { display: flex; gap: 12px; align-items: center; font-size: 14px; }
                    .icon { color: var(--success); font-weight: bold; }
                    .sub { font-size: 12px; color: var(--text-2); text-transform: capitalize; }
                `}</style>
            </Card>
        );
    }

    return (
        <Card className="doc-card">
            <div className="doc-card__content">
                <div className="doc-card__header">
                    <span className="icon">📄</span>
                    <div>
                        <strong>AI Suggestion: Upload Document</strong>
                        <p className="reason">{reason}</p>
                    </div>
                </div>

                <div className="doc-card__actions">
                    <div className="file-input-wrapper">
                        <Input
                            type="file"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void handleUpload(file);
                            }}
                            disabled={uploading || !intakeId}
                            style={{ fontSize: '12px' }}
                        />
                    </div>
                    {uploading && <span className="status">Uploading...</span>}
                </div>

                {uploadError && <div className="error">{uploadError}</div>}
            </div>

            <style jsx>{`
                .doc-card :global(.card) {
                    padding: 16px;
                    border: 1px dashed var(--accent);
                    background: var(--surface-1);
                }
                .doc-card__header {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 12px;
                }
                .icon { font-size: 20px; }
                .reason {
                    font-size: 13px;
                    color: var(--text-1);
                    margin: 2px 0 0 0;
                }
                .doc-card__actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .file-input-wrapper { flex: 1; }
                .status { font-size: 12px; color: var(--text-2); }
                .error { 
                    margin-top: 8px; 
                    font-size: 12px; 
                    color: var(--error); 
                }
            `}</style>
        </Card>
    );
}
