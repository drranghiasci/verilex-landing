import Sidebar from '../components/Sidebar';
import CaseCard from '../components/CaseCard';

const mockCases = [
  {
    id: '1',
    clientName: 'Jane Doe',
    caseType: 'Uncontested Divorce',
    location: 'Georgia',
    status: 'In Progress',
  },
  {
    id: '2',
    clientName: 'John Smith',
    caseType: 'Contested Divorce',
    location: 'Florida',
    status: 'Draft',
  },
];

export default function Dashboard() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-6">Your Cases</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCases.map((caseData) => (
            <CaseCard key={caseData.id} caseData={caseData} />
          ))}
        </div>
      </main>
    </div>
  );
}
