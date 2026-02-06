'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Upload, Send, FileText } from 'lucide-react'
import { callAIAgent } from '@/lib/aiAgent'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// TypeScript interfaces from test responses
interface CategorySummary {
  amount: number
  percentage: number
  count: number
}

interface Transaction {
  date: string
  merchant: string
  amount: number
  category: string
  subcategory: string
}

interface TopMerchant {
  merchant: string
  amount: number
  count: number
}

interface DashboardData {
  financial_alignment_score: number
  total_transactions: number
  total_amount: number
  category_summary: {
    survival: CategorySummary
    lifestyle: CategorySummary
    future: CategorySummary
  }
  top_merchants: TopMerchant[]
  transactions: Transaction[]
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

  // Chart data for donut
  const getChartData = () => {
    if (!dashboardData) return []
    return [
      { name: 'Survival', value: dashboardData.category_summary.survival.percentage, color: '#1a237e' },
      { name: 'Lifestyle', value: dashboardData.category_summary.lifestyle.percentage, color: '#00bfa5' },
      { name: 'Future', value: dashboardData.category_summary.future.percentage, color: '#5e35b1' },
    ]
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
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Financial Alignment Score */}
                <Card className="border-2 border-gray-200">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Financial Alignment Score
                      </h3>
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
                      <p className="text-sm text-gray-600 mt-4">
                        Based on {dashboardData.total_transactions} transactions totaling ₹
                        {dashboardData.total_amount.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Breakdown */}
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Donut Chart */}
                      <div>
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={getChartData()}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
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

                      {/* Category Cards */}
                      <div className="space-y-3">
                        {Object.entries(dashboardData.category_summary).map(([key, data]) => (
                          <div
                            key={key}
                            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900 capitalize">
                                  {key}
                                </h4>
                                <p className="text-xs text-gray-600">{data.count} transactions</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-gray-900">
                                  ₹{data.amount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {data.percentage.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Merchants */}
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle>Top Merchants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData.top_merchants.slice(0, 5).map((merchant, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{merchant.merchant}</p>
                            <p className="text-xs text-gray-600">{merchant.count} transactions</p>
                          </div>
                          <p className="font-bold text-[#1a237e]">
                            ₹{merchant.amount.toLocaleString('en-IN')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Transactions Table */}
                <Card className="border-2 border-gray-200">
                  <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Date
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Merchant
                            </th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">
                              Amount
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Category
                            </th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">
                              Subcategory
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.transactions.map((txn, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 text-gray-900">{txn.date}</td>
                              <td className="py-3 px-4 text-gray-900">{txn.merchant}</td>
                              <td className="py-3 px-4 text-right font-medium text-gray-900">
                                ₹{txn.amount.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-[#1a237e] text-white text-xs rounded-full">
                                  {txn.category}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-gray-600 text-xs">
                                {txn.subcategory}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Insights */}
                {insights.length > 0 && (
                  <Card className="border-2 border-[#00bfa5]">
                    <CardHeader>
                      <CardTitle className="text-[#1a237e]">Insights & Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {insights.map((insight, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#00bfa5] mt-1">•</span>
                            <p className="text-sm text-gray-700">{insight}</p>
                          </li>
                        ))}
                      </ul>
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
