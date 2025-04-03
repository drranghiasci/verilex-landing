import Link from 'next/link';

export default function CaseCard({ caseData }) {
  return (
    <Link href={`/case/${caseData.id}`}>
      <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition cursor-pointer">
        <h3 className="text-lg font-semibold mb-2">{caseData.clientName}</h3>
        <p className="text-sm text-gray-600">{caseData.caseType}</p>
        <p className="text-sm text-gray-600">{caseData.location}</p>
        <span className="inline-block mt-4 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
          {caseData.status}
        </span>
      </div>
    </Link>
  );
}
