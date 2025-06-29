import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Users, BarChart3, MessageCircle, CheckCircle, Clock, Mail, Phone } from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState('survey');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [surveyData, setSurveyData] = useState({
    practiceYears: '',
    caseVolume: '',
    currentSoftware: '',
    biggestPainPoint: '',
    timeSpentOnAdmin: '',
    clientCommunicationMethod: '',
    documentManagementIssues: '',
    automationInterest: '',
    budgetRange: '',
    mostFrustratingTask: '',
    idealSolution: '',
    contactInfo: {
      name: '',
      email: '',
      phone: '',
      firmName: ''
    }
  });

  const [analytics, setAnalytics] = useState({
    totalResponses: 0,
    responses: [],
    painPointsData: [],
    budgetData: []
  });

  // Load analytics data
  useEffect(() => {
    if (activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [activeTab]);

  const loadAnalytics = async () => {
    try {
      const { data: responses, error } = await supabase
        .from('survey_responses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process analytics
      const painPoints = responses.reduce((acc, response) => {
        if (response.biggest_pain_point) {
          acc[response.biggest_pain_point] = (acc[response.biggest_pain_point] || 0) + 1;
        }
        return acc;
      }, {});

      const budgetDistribution = responses.reduce((acc, response) => {
        if (response.budget_range) {
          acc[response.budget_range] = (acc[response.budget_range] || 0) + 1;
        }
        return acc;
      }, {});

      setAnalytics({
        totalResponses: responses.length,
        responses: responses.slice(0, 10), // Show latest 10
        painPointsData: Object.entries(painPoints).sort(([,a], [,b]) => b - a),
        budgetData: Object.entries(budgetDistribution)
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleSurveyChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setSurveyData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setSurveyData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const submitSurvey = async () => {
    setIsSubmitting(true);
    
    try {
      // Prepare data for Supabase
      const submissionData = {
        practice_years: surveyData.practiceYears,
        case_volume: surveyData.caseVolume,
        current_software: surveyData.currentSoftware,
        biggest_pain_point: surveyData.biggestPainPoint,
        time_spent_admin: surveyData.timeSpentOnAdmin,
        client_communication_method: surveyData.clientCommunicationMethod,
        document_management_issues: surveyData.documentManagementIssues,
        automation_interest: parseInt(surveyData.automationInterest) || null,
        budget_range: surveyData.budgetRange,
        most_frustrating_task: surveyData.mostFrustratingTask,
        ideal_solution: surveyData.idealSolution,
        contact_name: surveyData.contactInfo.name,
        contact_email: surveyData.contactInfo.email,
        contact_phone: surveyData.contactInfo.phone,
        firm_name: surveyData.contactInfo.firmName
      };

      const { data, error } = await supabase
        .from('survey_responses')
        .insert([submissionData]);

      if (error) throw error;

      setSubmitSuccess(true);
      
      // Reset form after successful submission
      setSurveyData({
        practiceYears: '',
        caseVolume: '',
        currentSoftware: '',
        biggestPainPoint: '',
        timeSpentOnAdmin: '',
        clientCommunicationMethod: '',
        documentManagementIssues: '',
        automationInterest: '',
        budgetRange: '',
        mostFrustratingTask: '',
        idealSolution: '',
        contactInfo: {
          name: '',
          email: '',
          phone: '',
          firmName: ''
        }
      });

      // Hide success message after 3 seconds
      setTimeout(() => setSubmitSuccess(false), 3000);

    } catch (error) {
      console.error('Error submitting survey:', error);
      alert('There was an error submitting your survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const SurveyForm = () => (
    <div className="space-y-6">
      {submitSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-800">Thank you! Your survey has been submitted successfully.</p>
        </div>
      )}

      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-xl font-semibold text-blue-900 mb-2">Solo Divorce Attorney Research Survey</h3>
        <p className="text-blue-700">Help us build the perfect legal tech solution for your practice. This survey takes 5-7 minutes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Years in Practice</label>
          <select 
            value={surveyData.practiceYears} 
            onChange={(e) => handleSurveyChange('practiceYears', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select range</option>
            <option value="1-5">1-5 years</option>
            <option value="5-10">5-10 years</option>
            <option value="10-15">10-15 years</option>
            <option value="15+">15+ years</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Divorce Cases</label>
          <select 
            value={surveyData.caseVolume} 
            onChange={(e) => handleSurveyChange('caseVolume', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select range</option>
            <option value="1-5">1-5 cases</option>
            <option value="6-15">6-15 cases</option>
            <option value="16-30">16-30 cases</option>
            <option value="30+">30+ cases</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Current Software/Tools</label>
        <input 
          type="text" 
          value={surveyData.currentSoftware}
          onChange={(e) => handleSurveyChange('currentSoftware', e.target.value)}
          placeholder="e.g., Clio, MyCase, Excel, Paper files..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Biggest Pain Point in Your Practice</label>
        <select 
          value={surveyData.biggestPainPoint} 
          onChange={(e) => handleSurveyChange('biggestPainPoint', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select primary pain point</option>
          <option value="Client communication">Client communication</option>
          <option value="Document management">Document management</option>
          <option value="Case tracking">Case tracking & deadlines</option>
          <option value="Financial analysis">Financial disclosure analysis</option>
          <option value="Court filings">Court filings & procedures</option>
          <option value="Time tracking">Time tracking & billing</option>
          <option value="Client intake">Client intake process</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hours/Week on Administrative Tasks</label>
        <select 
          value={surveyData.timeSpentOnAdmin} 
          onChange={(e) => handleSurveyChange('timeSpentOnAdmin', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select range</option>
          <option value="2-4 hours">2-4 hours</option>
          <option value="4-6 hours">4-6 hours</option>
          <option value="6-8 hours">6-8 hours</option>
          <option value="8-10 hours">8-10 hours</option>
          <option value="10+ hours">10+ hours</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Most Frustrating Repetitive Task</label>
        <textarea 
          value={surveyData.mostFrustratingTask}
          onChange={(e) => handleSurveyChange('mostFrustratingTask', e.target.value)}
          placeholder="Describe the task that takes too much time or causes the most frustration..."
          rows="3"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Interest in AI Automation (1-10)</label>
        <select 
          value={surveyData.automationInterest} 
          onChange={(e) => handleSurveyChange('automationInterest', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select interest level</option>
          {[...Array(10)].map((_, i) => (
            <option key={i+1} value={i+1}>{i+1} {i+1 <= 3 ? '(Low)' : i+1 <= 7 ? '(Medium)' : '(High)'}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Software Budget</label>
        <select 
          value={surveyData.budgetRange} 
          onChange={(e) => handleSurveyChange('budgetRange', e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select budget range</option>
          <option value="$0-50">$0-50</option>
          <option value="$50-100">$50-100</option>
          <option value="$100-300">$100-300</option>
          <option value="$300-500">$300-500</option>
          <option value="$500+">$500+</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ideal Solution Description</label>
        <textarea 
          value={surveyData.idealSolution}
          onChange={(e) => handleSurveyChange('idealSolution', e.target.value)}
          placeholder="If you could wave a magic wand, what would your ideal legal tech solution do?"
          rows="4"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-4">Contact Information (Optional - for follow-up interviews)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="text" 
            value={surveyData.contactInfo.name}
            onChange={(e) => handleSurveyChange('contactInfo.name', e.target.value)}
            placeholder="Full Name"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input 
            type="text" 
            value={surveyData.contactInfo.firmName}
            onChange={(e) => handleSurveyChange('contactInfo.firmName', e.target.value)}
            placeholder="Firm Name"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input 
            type="email" 
            value={surveyData.contactInfo.email}
            onChange={(e) => handleSurveyChange('contactInfo.email', e.target.value)}
            placeholder="Email Address"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input 
            type="tel" 
            value={surveyData.contactInfo.phone}
            onChange={(e) => handleSurveyChange('contactInfo.phone', e.target.value)}
            placeholder="Phone Number"
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <button 
        onClick={submitSurvey}
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit Survey
          </>
        )}
      </button>
    </div>
  );

  const AnalyticsDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Total Responses</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">{analytics.totalResponses}</p>
        </div>

        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">This Week</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {analytics.responses.filter(r => {
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return new Date(r.created_at) > weekAgo;
            }).length}
          </p>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-purple-600" />
            <h3 className="text-lg font-semibold text-purple-900">Avg Interest</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600">
            {analytics.responses.length > 0 
              ? Math.round(analytics.responses.reduce((sum, r) => sum + (r.automation_interest || 0), 0) / analytics.responses.length)
              : 0}/10
          </p>
        </div>
      </div>

      {analytics.painPointsData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Pain Points</h3>
            <div className="space-y-3">
              {analytics.painPointsData.map(([painPoint, count]) => (
                <div key={painPoint} className="flex justify-between items-center">
                  <span className="text-gray-700">{painPoint}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{width: `${(count / analytics.totalResponses) * 100}%`}}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Distribution</h3>
            <div className="space-y-3">
              {analytics.budgetData.map(([budget, count]) => (
                <div key={budget} className="flex justify-between items-center">
                  <span className="text-gray-700">{budget}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{width: `${(count / analytics.totalResponses) * 100}%`}}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {analytics.responses.length > 0 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Responses</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Experience</th>
                  <th className="text-left p-3">Pain Point</th>
                  <th className="text-left p-3">Budget</th>
                  <th className="text-left p-3">AI Interest</th>
                </tr>
              </thead>
              <tbody>
                {analytics.responses.map((response, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3">{new Date(response.created_at).toLocaleDateString()}</td>
                    <td className="p-3">{response.practice_years}</td>
                    <td className="p-3">{response.biggest_pain_point}</td>
                    <td className="p-3">{response.budget_range}</td>
                    <td className="p-3">{response.automation_interest}/10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const InterviewGuide = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
        <h3 className="text-xl font-semibold text-orange-900 mb-2">User Interview Guide</h3>
        <p className="text-orange-700">Structured interview questions for deeper insights from solo divorce attorneys.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Opening Questions (5 min)</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Tell me about your practice - how long have you been doing divorce law?</li>
            <li>• What does a typical day look like for you?</li>
            <li>• How many divorce cases do you handle per month?</li>
            <li>• What got you into solo practice vs. larger firms?</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Current Workflow (10 min)</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Walk me through your client intake process</li>
            <li>• How do you currently manage case documents?</li>
            <li>• What tools do you use for client communication?</li>
            <li>• How do you track deadlines and court dates?</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Pain Points (10 min)</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• What tasks take the most time but add the least value?</li>
            <li>• When do you feel most frustrated during your workday?</li>
            <li>• What would save you the most time if automated?</li>
            <li>• How do you handle financial disclosure analysis?</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-4">Solution Validation (10 min)</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• If AI could analyze financial documents, what would you want it to flag?</li>
            <li>• How would you want to communicate updates to clients automatically?</li>
            <li>• What would make you switch from your current tools?</li>
            <li>• What concerns would you have about AI in legal practice?</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VeriLex AI Market Research</h1>
        <p className="text-gray-600 text-lg">Solo Divorce Attorney Market Analysis & User Research</p>
      </div>

      <div className="mb-6">
        <nav className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('survey')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'survey' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageCircle className="w-4 h-4 inline mr-2" />
            Survey Form
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('interviews')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'interviews' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Interview Guide
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {activeTab === 'survey' && <SurveyForm />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'interviews' && <InterviewGuide />}
      </div>
    </div>
  );
}