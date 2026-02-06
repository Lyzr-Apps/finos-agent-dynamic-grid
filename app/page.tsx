'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, Send, FileText } from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// TypeScript interfaces from test responses - UPGRADED
interface CategorySummary {
  total_amount: number
  percentage: number
  transaction_count: number
}

interface Transaction {
  date: string
  merchant: string
  amount: number
  category: string
  subcategory: string
}

interface MerchantBreakdown {
  merchant: string
  category: string
  total_amount: number
  transaction_count: number
  percentage_of_category: number
  insights: string
}

interface CutBackOpportunity {
  area: string
  current_spend: number
  recommended_spend: number
  potential_savings: number
  actionable_advice: string
}

interface HabitAudit {
  impulsive_purchases: {
    count: number
    total_amount: number
    description: string
  }
  high_cost_dining: {
    count: number
    total_amount: number
    description: string
  }
  subscription_analysis: {
    total_subscriptions: number
    monthly_cost: number
    redundant_subscriptions: string[]
  }
  cut_back_opportunities: CutBackOpportunity[]
}

interface DashboardData {
  financial_alignment_score: number
  total_transactions: number
  total_amount: number
  category_summary: {
    dining: CategorySummary
    shopping: CategorySummary
    bill_payments: CategorySummary
    travel: CategorySummary
    investments: CategorySummary
    others: CategorySummary
  }
  merchant_breakdown: MerchantBreakdown[]
  habit_audit: HabitAudit
  transactions: Transaction[]
  insights: string[]
  recommendations: string[]
}

interface ManagerAgentResponse {
  workflow_status: string
  dashboard_data: DashboardData
  query_response?: string
  insights: string[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// Agent IDs
const FINOS_MANAGER_AGENT_ID = '6985a70a301c62c7ca2c7e05'

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<string>('')
  const [rowCount, setRowCount] = useState<number>(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisStage, setAnalysisStage] = useState('')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [insights, setInsights] = useState<string[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Parse CSV file
  const parseCSV = (text: string): number => {
    const lines = text.trim().split('\n')
    return lines.length - 1 // Subtract header row
  }

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setCsvData(text)
        const rows = parseCSV(text)
        setRowCount(rows)
      }
      reader.readAsText(selectedFile)
    }
  }

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile)
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setCsvData(text)
        const rows = parseCSV(text)
        setRowCount(rows)
      }
      reader.readAsText(droppedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  // Analyze transactions
  const analyzeTransactions = async () => {
    if (!csvData) return

    setAnalyzing(true)
    setAnalysisStage('Cleaning data...')

    try {
      // Send CSV data to Manager Agent
      const message = `Analyze these transaction data:\n\n${csvData}`

      // Simulate analysis stages
      setTimeout(() => setAnalysisStage('Categorizing transactions...'), 1000)
      setTimeout(() => setAnalysisStage('Calculating financial score...'), 2000)

      const result = await callAIAgent(message, FINOS_MANAGER_AGENT_ID)

      if (result.success && result.response.status === 'success') {
        const managerResponse = result.response.result as ManagerAgentResponse

        if (managerResponse.dashboard_data) {
          setDashboardData(managerResponse.dashboard_data)
          setInsights(managerResponse.insights || [])
        }
      }
    } catch (error) {
      console.error('Analysis error:', error)
    } finally {
      setAnalyzing(false)
      setAnalysisStage('')
    }
  }

  // Handle chat
  const handleSendMessage = async () => {
    if (!chatInput.trim() || !dashboardData) return

    const userMessage: ChatMessage = { role: 'user', content: chatInput }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      // Include dashboard context in the query
      const contextMessage = `Based on the analyzed transaction data, answer this query: ${chatInput}`

      const result = await callAIAgent(contextMessage, FINOS_MANAGER_AGENT_ID)

      if (result.success && result.response.status === 'success') {
        const managerResponse = result.response.result as ManagerAgentResponse
        const responseText = managerResponse.query_response || 'Analysis complete.'

        const assistantMessage: ChatMessage = { role: 'assistant', content: responseText }
        setChatMessages((prev) => [...prev, assistantMessage])
      } else {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your query.'
        }
        setChatMessages((prev) => [...prev, errorMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
    } finally {
      setChatLoading(false)
    }
  }

  // Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#00bfa5'
    if (score >= 50) return '#ffd700'
    return '#ff5252'
  }

  // Chart data for donut - UPGRADED with granular categories
  const getChartData = () => {
    if (!dashboardData) return []
    return [
      { name: 'Dining', value: dashboardData.category_summary.dining.percentage, color: '#ff6b6b' },
      { name: 'Shopping', value: dashboardData.category_summary.shopping.percentage, color: '#4ecdc4' },
      { name: 'Bill Payments', value: dashboardData.category_summary.bill_payments.percentage, color: '#45b7d1' },
      { name: 'Travel', value: dashboardData.category_summary.travel.percentage, color: '#96ceb4' },
      { name: 'Investments', value: dashboardData.category_summary.investments.percentage, color: '#1a237e' },
      { name: 'Others', value: dashboardData.category_summary.others.percentage, color: '#95a5a6' },
    ]
  }

  // Get category color
  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      dining: '#ff6b6b',
      shopping: '#4ecdc4',
      bill_payments: '#45b7d1',
      travel: '#96ceb4',
      investments: '#1a237e',
      others: '#95a5a6'
    }
    return colors[category.toLowerCase().replace(' ', '_')] || '#95a5a6'
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#1a237e] text-white py-6 px-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">FinOS</h1>
          <p className="text-sm opacity-90 mt-1">Financial Intelligence Dashboard</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload & Chat */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Section */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Upload Transactions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#00bfa5] transition-colors cursor-pointer"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-700">Upload Transaction CSV</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Drag and drop or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                {file && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#1a237e]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-600">{rowCount} transactions</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={analyzeTransactions}
                  disabled={!file || analyzing}
                  className="w-full bg-[#00bfa5] hover:bg-[#00a896] text-white"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {analysisStage}
                    </>
                  ) : (
                    'Analyze Transactions'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Chat Interface */}
            <Card className="border-2 border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Ask Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Chat Messages */}
                  <div className="h-64 overflow-y-auto space-y-3 mb-4">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8">
                        {dashboardData
                          ? 'Ask questions about your transactions'
                          : 'Upload and analyze transactions first'}
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-[#1a237e] text-white ml-8'
                              : 'bg-gray-100 text-gray-900 mr-8'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      ))
                    )}
                    {chatLoading && (
                      <div className="bg-gray-100 p-3 rounded-lg mr-8">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="e.g., What was my total Swiggy spend?"
                      disabled={!dashboardData || chatLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!dashboardData || !chatInput.trim() || chatLoading}
                      className="bg-[#00bfa5] hover:bg-[#00a896] text-white"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Metrics Dashboard */}
          <div className="lg:col-span-2">
            {!dashboardData ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <Upload className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">Upload transactions to view analytics</p>
                  <p className="text-sm mt-2">Get your complete Financial Health Report</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Financial Health Report Header */}
                <Card className="border-2 border-[#1a237e] bg-gradient-to-r from-[#1a237e] to-[#00bfa5] shadow-lg">
                  <CardContent className="pt-8 pb-8">
                    <div className="text-center text-white">
                      <h2 className="text-3xl font-bold mb-3 tracking-tight">Financial Health Report</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 mb-4">
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                          <p className="text-xs uppercase tracking-wider opacity-90 mb-1">Total Transactions</p>
                          <p className="text-2xl font-bold">{dashboardData.total_transactions}</p>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                          <p className="text-xs uppercase tracking-wider opacity-90 mb-1">Total Spending</p>
                          <p className="text-2xl font-bold">₹{dashboardData.total_amount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-4">
                          <p className="text-xs uppercase tracking-wider opacity-90 mb-1">Financial Score</p>
                          <p className="text-2xl font-bold">{dashboardData.financial_alignment_score}/100</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Visualization & Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Financial Alignment Score Gauge */}
                  <Card className="border-2 border-[#1a237e]">
                    <CardHeader>
                      <CardTitle className="text-[#1a237e]">Financial Alignment Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <div className="relative inline-block">
                          <svg width="200" height="200" className="transform -rotate-90">
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              stroke="#e5e7eb"
                              strokeWidth="16"
                              fill="none"
                            />
                            <circle
                              cx="100"
                              cy="100"
                              r="80"
                              stroke={getScoreColor(dashboardData.financial_alignment_score)}
                              strokeWidth="16"
                              fill="none"
                              strokeDasharray={`${
                                (dashboardData.financial_alignment_score / 100) * 2 * Math.PI * 80
                              } ${2 * Math.PI * 80}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div>
                              <div
                                className="text-5xl font-bold"
                                style={{ color: getScoreColor(dashboardData.financial_alignment_score) }}
                              >
                                {dashboardData.financial_alignment_score}
                              </div>
                              <div className="text-sm text-gray-600">out of 100</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full bg-[#00bfa5]"></div>
                            <span className="text-gray-700">Excellent (75-100)</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full bg-[#ffd700]"></div>
                            <span className="text-gray-700">Good (50-74)</span>
                          </div>
                          <div className="flex items-center justify-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full bg-[#ff5252]"></div>
                            <span className="text-gray-700">Needs Attention (&lt;50)</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Categories Summary */}
                  <Card className="border-2 border-[#00bfa5]">
                    <CardHeader>
                      <CardTitle className="text-[#1a237e]">Top Spending Categories</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(dashboardData.category_summary)
                          .sort((a, b) => b[1].total_amount - a[1].total_amount)
                          .slice(0, 5)
                          .map(([key, data], idx) => (
                            <div key={key} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-sm">
                                  {idx + 1}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 capitalize text-sm">
                                    {key.replace('_', ' ')}
                                  </p>
                                  <p className="text-xs text-gray-600">{data.transaction_count} transactions</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-[#1a237e]">₹{data.total_amount.toLocaleString('en-IN')}</p>
                                <p className="text-xs text-gray-600">{data.percentage.toFixed(1)}%</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Category Breakdown */}
                <Card className="border-2 border-[#1a237e]">
                  <CardHeader className="bg-gradient-to-r from-[#1a237e] to-[#00bfa5]">
                    <CardTitle className="text-white">Complete Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Donut Chart */}
                      <div className="flex flex-col items-center">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Visual Distribution</h4>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={getChartData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {getChartData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => `${value.toFixed(2)}%`}
                            />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Category Cards - UPGRADED */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Category Details</h4>
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                          {Object.entries(dashboardData.category_summary)
                            .sort((a, b) => b[1].total_amount - a[1].total_amount)
                            .map(([key, data]) => (
                              <div
                                key={key}
                                className="bg-gradient-to-r from-gray-50 to-white p-3 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-shadow"
                                style={{ borderLeftColor: getCategoryColor(key) }}
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 capitalize text-sm">
                                      {key.replace('_', ' ')}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">{data.transaction_count} transactions</p>
                                  </div>
                                  <div className="text-right ml-4">
                                    <p className="font-bold text-[#1a237e] text-sm">
                                      ₹{data.total_amount.toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-xs font-semibold text-[#00bfa5]">
                                      {data.percentage.toFixed(1)}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Merchant Deep-Dive Analysis */}
                <Card className="border-2 border-[#00bfa5] shadow-md">
                  <CardHeader className="bg-gradient-to-r from-[#00bfa5] to-[#1a237e]">
                    <CardTitle className="text-white">Merchant Deep-Dive Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="mb-4 text-sm text-gray-600">
                      Detailed breakdown of your top merchants and spending patterns
                    </div>
                    <div className="space-y-4">
                      {dashboardData.merchant_breakdown.slice(0, 10).map((merchant, idx) => (
                        <div
                          key={idx}
                          className="border-l-4 bg-gradient-to-r from-gray-50 to-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all"
                          style={{ borderLeftColor: getCategoryColor(merchant.category) }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1a237e] text-white font-bold text-xs">
                                  {idx + 1}
                                </span>
                                <p className="font-bold text-gray-900 text-base">{merchant.merchant}</p>
                                <span
                                  className="px-3 py-1 text-xs font-semibold rounded-full text-white"
                                  style={{ backgroundColor: getCategoryColor(merchant.category) }}
                                >
                                  {merchant.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-600 ml-8">
                                <span className="font-medium">{merchant.transaction_count} transaction{merchant.transaction_count > 1 ? 's' : ''}</span>
                                <span className="font-medium">{merchant.percentage_of_category.toFixed(1)}% of {merchant.category}</span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="font-bold text-[#1a237e] text-xl">
                                ₹{merchant.total_amount.toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>
                          <div className="ml-8 mt-2 bg-white p-3 rounded-lg border-l-2 border-[#00bfa5]">
                            <p className="text-sm text-gray-700 italic leading-relaxed">
                              <span className="font-semibold text-[#1a237e]">Insight:</span> {merchant.insights}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Spending Habit Audit */}
                <Card className="border-2 border-orange-400 shadow-md">
                  <CardHeader className="bg-gradient-to-r from-orange-400 to-red-400">
                    <CardTitle className="text-white">Spending Habit Audit</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="mb-4 text-sm text-gray-600">
                      Behavioral analysis and opportunities to optimize your spending habits
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Impulsive Purchases */}
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-5 rounded-xl border-2 border-orange-300 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">!</span>
                            </div>
                            <h4 className="font-bold text-orange-700 text-base">Impulsive Purchases</h4>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-orange-700 text-lg">
                              ₹{dashboardData.habit_audit.impulsive_purchases.total_amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-orange-600 font-medium">
                              {dashboardData.habit_audit.impulsive_purchases.count} purchases
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {dashboardData.habit_audit.impulsive_purchases.description}
                        </p>
                      </div>

                      {/* High Cost Dining */}
                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border-2 border-red-300 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-red-400 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">$</span>
                            </div>
                            <h4 className="font-bold text-red-700 text-base">High-Cost Dining</h4>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-700 text-lg">
                              ₹{dashboardData.habit_audit.high_cost_dining.total_amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-red-600 font-medium">
                              {dashboardData.habit_audit.high_cost_dining.count} instances
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {dashboardData.habit_audit.high_cost_dining.description}
                        </p>
                      </div>

                      {/* Subscription Analysis */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl border-2 border-blue-300 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-blue-400 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">∞</span>
                            </div>
                            <h4 className="font-bold text-blue-700 text-base">Subscriptions</h4>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-blue-700 text-lg">
                              ₹{dashboardData.habit_audit.subscription_analysis.monthly_cost.toLocaleString('en-IN')}/mo
                            </p>
                            <p className="text-xs text-blue-600 font-medium">
                              {dashboardData.habit_audit.subscription_analysis.total_subscriptions} active
                            </p>
                          </div>
                        </div>
                        {dashboardData.habit_audit.subscription_analysis.redundant_subscriptions.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-sm font-semibold text-red-600 mb-1">Redundant subscriptions:</p>
                            <ul className="text-sm text-gray-700 ml-4 space-y-1">
                              {dashboardData.habit_audit.subscription_analysis.redundant_subscriptions.map((sub, idx) => (
                                <li key={idx} className="flex items-center gap-1">
                                  <span className="text-red-500">•</span> {sub}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            All subscriptions are essential. No redundancies detected.
                          </p>
                        )}
                      </div>

                      {/* Total Potential Savings */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-xl border-2 border-green-300 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">💰</span>
                            </div>
                            <h4 className="font-bold text-green-700 text-base">Total Savings</h4>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-700 text-lg">
                              ₹{dashboardData.habit_audit.cut_back_opportunities.reduce((sum, opp) => sum + opp.potential_savings, 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              Potential monthly savings
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          By implementing the recommendations below, you can save this amount monthly.
                        </p>
                      </div>
                    </div>

                    {/* Cut-Back Opportunities */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-300">
                      <h4 className="font-bold text-green-700 mb-4 text-lg flex items-center gap-2">
                        <span className="text-2xl">💡</span> Cut-Back Opportunities
                      </h4>
                      <div className="space-y-3">
                        {dashboardData.habit_audit.cut_back_opportunities.map((opp, idx) => (
                          <div key={idx} className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white font-bold text-sm">
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-bold text-gray-900 text-base">{opp.area}</p>
                                  <p className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">Current:</span> ₹{opp.current_spend.toLocaleString('en-IN')}
                                    <span className="mx-2">→</span>
                                    <span className="font-medium">Target:</span> ₹{opp.recommended_spend.toLocaleString('en-IN')}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-xs text-gray-600 mb-1">Save</p>
                                <p className="font-bold text-green-600 text-xl">
                                  ₹{opp.potential_savings.toLocaleString('en-IN')}
                                </p>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-l-4 border-green-500 ml-10">
                              <p className="text-sm text-gray-800 leading-relaxed">
                                <span className="font-semibold text-green-700">Action:</span> {opp.actionable_advice}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Complete Transaction History */}
                <Card className="border-2 border-[#1a237e]">
                  <CardHeader className="bg-gradient-to-r from-[#1a237e] to-[#00bfa5]">
                    <CardTitle className="text-white">Complete Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="mb-4 text-sm text-gray-600">
                      All {dashboardData.transactions.length} categorized transactions with detailed breakdowns
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-4 px-4 font-bold text-gray-800">
                              Date
                            </th>
                            <th className="text-left py-4 px-4 font-bold text-gray-800">
                              Merchant
                            </th>
                            <th className="text-right py-4 px-4 font-bold text-gray-800">
                              Amount
                            </th>
                            <th className="text-left py-4 px-4 font-bold text-gray-800">
                              Category
                            </th>
                            <th className="text-left py-4 px-4 font-bold text-gray-800">
                              Subcategory
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.transactions.map((txn, idx) => (
                            <tr key={idx} className="border-b border-gray-200 hover:bg-blue-50 transition-colors">
                              <td className="py-4 px-4 text-gray-900 font-medium">{txn.date}</td>
                              <td className="py-4 px-4 text-gray-900 font-semibold">{txn.merchant}</td>
                              <td className="py-4 px-4 text-right font-bold text-[#1a237e] text-base">
                                ₹{txn.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className="px-3 py-1.5 text-white text-xs font-semibold rounded-full shadow-sm"
                                  style={{ backgroundColor: getCategoryColor(txn.category.toLowerCase().replace(' ', '_')) }}
                                >
                                  {txn.category}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-gray-700 text-xs font-medium">
                                {txn.subcategory}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* AI-Powered Insights & Recommendations */}
                {(dashboardData.insights.length > 0 || dashboardData.recommendations.length > 0) && (
                  <Card className="border-2 border-[#00bfa5] shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-[#00bfa5] to-[#1a237e]">
                      <CardTitle className="text-white text-xl">AI-Powered Insights & Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-6">
                        {/* Insights */}
                        {dashboardData.insights.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">📊</span>
                              </div>
                              <h4 className="font-bold text-[#1a237e] text-lg">Spending Pattern Insights</h4>
                            </div>
                            <div className="space-y-3 ml-12">
                              {dashboardData.insights.map((insight, idx) => (
                                <div
                                  key={idx}
                                  className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex items-center justify-center min-w-[24px] h-6 rounded-full bg-blue-500 text-white font-bold text-xs">
                                      {idx + 1}
                                    </span>
                                    <p className="text-sm text-gray-800 leading-relaxed flex-1">
                                      {insight}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {dashboardData.recommendations.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-white font-bold text-xl">✅</span>
                              </div>
                              <h4 className="font-bold text-[#1a237e] text-lg">Action Recommendations</h4>
                            </div>
                            <div className="space-y-3 ml-12">
                              {dashboardData.recommendations.map((rec, idx) => (
                                <div
                                  key={idx}
                                  className="bg-gradient-to-r from-green-50 to-emerald-100 p-4 rounded-lg border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex items-center justify-center min-w-[24px] h-6 rounded-full bg-green-500 text-white font-bold text-xs">
                                      {idx + 1}
                                    </span>
                                    <p className="text-sm text-gray-800 leading-relaxed flex-1 font-medium">
                                      {rec}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Report Summary Footer */}
                        <div className="mt-6 pt-6 border-t-2 border-gray-200">
                          <div className="bg-gradient-to-r from-[#1a237e] to-[#00bfa5] p-4 rounded-lg text-center">
                            <p className="text-white text-sm font-medium">
                              Financial Health Report Generated • {dashboardData.total_transactions} Transactions Analyzed •
                              {' '}Score: {dashboardData.financial_alignment_score}/100
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
