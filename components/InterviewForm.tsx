"use client";

import { useState } from "react";
import type { InterviewRecord, InterviewRound, InterviewStatus } from "@/lib/interviews";
import { createEmptyRound } from "@/lib/interviews";
import { supabase } from "@/lib/supabase";
import type { Job } from "@/lib/types";
import type { TrackingData } from "@/lib/tracker";

const WORKER_URL =
  typeof window !== "undefined"
    ? "/ai"
    : process.env.NEXT_PUBLIC_WORKER_URL || "https://career-search-oauth.keyu-chen.workers.dev";

export interface TrackedJobOption {
  jobId: string;
  company: string;
  title: string;
  channel?: string;
}

interface Props {
  initial?: InterviewRecord;
  trackedJobs?: TrackedJobOption[];
  onSave: (data: Omit<InterviewRecord, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
}

interface AiParsed {
  company?: string;
  position?: string;
  department?: string | null;
  round?: string;
  date?: string;
  interviewer?: string | null;
  duration?: number | null;
  questions?: string[];
  myAnswers?: string[] | null;
  feeling?: string;
  feedback?: string | null;
  nextPrepare?: string | null;
  result?: string;
  salaryInfo?: string | null;
  notes?: string | null;
}

const STATUS_OPTIONS: { value: InterviewStatus; label: string }[] = [
  { value: "进行中", label: "进行中" },
  { value: "已拿offer", label: "已拿 Offer" },
  { value: "已拒", label: "已拒" },
  { value: "已放弃", label: "已放弃" },
];

const ROUND_OPTIONS = ["一面", "二面", "三面", "四面", "HR面", "终面", "笔试", "群面"];
const FEELING_OPTIONS: InterviewRound["feeling"][] = ["好", "一般", "差"];
const RESULT_OPTIONS: InterviewRound["result"][] = ["通过", "待定", "挂了"];

export default function InterviewForm({ initial, trackedJobs, onSave, onCancel }: Props) {
  const [company, setCompany] = useState(initial?.company ?? "");
  const [position, setPosition] = useState(initial?.position ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [channel, setChannel] = useState(initial?.channel ?? "");
  const [relatedJobId, setRelatedJobId] = useState(initial?.relatedJobId ?? "");
  const [status, setStatus] = useState<InterviewStatus>(initial?.status ?? "进行中");
  const [rounds, setRounds] = useState<InterviewRound[]>(initial?.rounds ?? []);
  const [salaryInfo, setSalaryInfo] = useState(initial?.salaryInfo ?? "");
  const [offerDetail, setOfferDetail] = useState(initial?.offerDetail ?? "");
  const [nextInterviewAt, setNextInterviewAt] = useState(initial?.nextInterviewAt ?? "");
  const [nextPrepare, setNextPrepare] = useState(initial?.nextPrepare ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  async function handleAiParse() {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${WORKER_URL}/api/interview/parse`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: aiText, today: new Date().toISOString().slice(0, 10) }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "解析失败");
      }

      const parsed: AiParsed = await res.json();

      if (parsed.company) setCompany(parsed.company);
      if (parsed.position) setPosition(parsed.position);
      if (parsed.department) setDepartment(parsed.department);
      if (parsed.salaryInfo) setSalaryInfo(parsed.salaryInfo);
      if (parsed.notes) setNotes(parsed.notes);
      if (parsed.nextPrepare) setNextPrepare(parsed.nextPrepare);

      if (parsed.round || parsed.date || parsed.questions?.length) {
        const newRound: InterviewRound = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
          round: parsed.round ?? "",
          date: parsed.date ?? new Date().toISOString().slice(0, 10),
          interviewer: parsed.interviewer ?? undefined,
          duration: parsed.duration ?? undefined,
          questions: parsed.questions ?? [],
          myAnswers: parsed.myAnswers ?? undefined,
          feeling: (["好", "一般", "差"].includes(parsed.feeling ?? "") ? parsed.feeling : "") as InterviewRound["feeling"],
          feedback: parsed.feedback ?? undefined,
          nextPrepare: parsed.nextPrepare ?? undefined,
          result: (["通过", "待定", "挂了"].includes(parsed.result ?? "") ? parsed.result : "") as InterviewRound["result"],
        };
        setRounds((prev) => [...prev, newRound]);
      }
    } catch (e) {
      setAiError((e as Error).message);
    } finally {
      setAiLoading(false);
    }
  }

  function addRound() {
    setRounds((prev) => [...prev, createEmptyRound()]);
  }

  function updateRound(idx: number, patch: Partial<InterviewRound>) {
    setRounds((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function removeRound(idx: number) {
    setRounds((prev) => prev.filter((_, i) => i !== idx));
  }

  function addQuestion(roundIdx: number) {
    setRounds((prev) => prev.map((r, i) => i === roundIdx ? { ...r, questions: [...r.questions, ""] } : r));
  }

  function updateQuestion(roundIdx: number, qIdx: number, value: string) {
    setRounds((prev) => prev.map((r, i) => {
      if (i !== roundIdx) return r;
      const questions = [...r.questions];
      questions[qIdx] = value;
      return { ...r, questions };
    }));
  }

  function removeQuestion(roundIdx: number, qIdx: number) {
    setRounds((prev) => prev.map((r, i) => {
      if (i !== roundIdx) return r;
      return { ...r, questions: r.questions.filter((_, j) => j !== qIdx) };
    }));
  }

  function handleSelectTrackedJob(jobId: string) {
    if (!jobId) {
      setRelatedJobId("");
      return;
    }
    const tj = trackedJobs?.find((j) => j.jobId === jobId);
    if (!tj) return;
    setRelatedJobId(jobId);
    setCompany(tj.company);
    setPosition(tj.title);
    if (tj.channel) setChannel(tj.channel);
  }

  function handleSubmit() {
    if (!company.trim() || !position.trim()) return;
    onSave({
      company: company.trim(),
      position: position.trim(),
      department: department.trim() || undefined,
      channel: channel.trim() || undefined,
      status,
      rounds,
      salaryInfo: salaryInfo.trim() || undefined,
      offerDetail: offerDetail.trim() || undefined,
      nextInterviewAt: nextInterviewAt || undefined,
      nextPrepare: nextPrepare.trim() || undefined,
      notes: notes.trim() || undefined,
      relatedJobId: relatedJobId || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{initial ? "编辑面试记录" : "新增面试记录"}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 关联已追踪岗位 */}
          {trackedJobs && trackedJobs.length > 0 && !initial && (
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-700">关联已追踪岗位</span>
                <span className="text-[10px] text-amber-500 bg-amber-100 px-1.5 py-0.5 rounded">自动同步状态</span>
              </div>
              <select
                value={relatedJobId}
                onChange={(e) => handleSelectTrackedJob(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-amber-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
              >
                <option value="">手动填写（不关联）</option>
                {trackedJobs.map((tj) => (
                  <option key={tj.jobId} value={tj.jobId}>{tj.company} · {tj.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* AI 快填区 */}
          <div className="rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 border border-brand-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-brand-700">AI 智能填入</span>
              <span className="text-[10px] text-brand-500 bg-brand-100 px-1.5 py-0.5 rounded">自然语言 → 结构化</span>
            </div>
            <textarea
              value={aiText}
              onChange={(e) => setAiText(e.target.value)}
              placeholder="描述你的面试情况，例如：今天下午腾讯微信支付产品经理一面，面试官是张明。问了我做过的项目、对支付行业的看法、一个需求分析case。大概40分钟，感觉还行..."
              rows={4}
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-brand-200 bg-white/80 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleAiParse}
                disabled={aiLoading || !aiText.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {aiLoading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {aiLoading ? "解析中..." : "AI 解析"}
              </button>
              {aiError && <span className="text-xs text-red-500">{aiError}</span>}
            </div>
          </div>

          {/* 基础信息 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">基础信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">公司 *</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="如：字节跳动" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">岗位 *</label>
                <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="如：AI产品经理" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">业务线 / 部门</label>
                <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="如：微信支付 / 飞书 / 商业化" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">投递渠道</label>
                <input value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="如：内推/Boss/官网" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">整体状态</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as InterviewStatus)} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400">
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">下次面试时间</label>
                <input type="date" value={nextInterviewAt} onChange={(e) => setNextInterviewAt(e.target.value)} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
              </div>
            </div>
          </div>

          {/* 面试轮次 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">面试轮次</h3>
              <button onClick={addRound} className="text-xs text-brand-600 hover:text-brand-700 font-medium">+ 添加轮次</button>
            </div>

            {rounds.length === 0 && (
              <div className="text-center text-sm text-gray-400 py-6 border border-dashed border-gray-200 rounded-lg">
                暂无面试轮次，点击上方添加或用 AI 自动解析
              </div>
            )}

            {rounds.map((round, rIdx) => (
              <div key={round.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-600">第 {rIdx + 1} 轮</span>
                  <button onClick={() => removeRound(rIdx)} className="text-[11px] text-red-400 hover:text-red-600">删除</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">轮次</label>
                    <select value={round.round} onChange={(e) => updateRound(rIdx, { round: e.target.value })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200">
                      <option value="">选择...</option>
                      {ROUND_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">日期</label>
                    <input type="date" value={round.date} onChange={(e) => updateRound(rIdx, { date: e.target.value })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">面试官</label>
                    <input value={round.interviewer ?? ""} onChange={(e) => updateRound(rIdx, { interviewer: e.target.value || undefined })} placeholder="姓名/部门" className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">时长(分钟)</label>
                    <input type="number" value={round.duration ?? ""} onChange={(e) => updateRound(rIdx, { duration: e.target.value ? parseInt(e.target.value) : undefined })} placeholder="40" className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200" />
                  </div>
                </div>

                {/* 问题列表 */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-400">面试问题</label>
                    <button onClick={() => addQuestion(rIdx)} className="text-[10px] text-brand-600">+ 添加问题</button>
                  </div>
                  {round.questions.map((q, qIdx) => (
                    <div key={qIdx} className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[10px] text-gray-300 w-4 shrink-0">{qIdx + 1}.</span>
                      <input value={q} onChange={(e) => updateQuestion(rIdx, qIdx, e.target.value)} placeholder="面试问题..." className="flex-1 text-xs px-2 py-1.5 rounded-md border border-gray-200" />
                      <button onClick={() => removeQuestion(rIdx, qIdx)} className="text-gray-300 hover:text-red-400 text-xs shrink-0">&times;</button>
                    </div>
                  ))}
                </div>

                {/* 感受 & 结果 */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">感受</label>
                    <select value={round.feeling} onChange={(e) => updateRound(rIdx, { feeling: e.target.value as InterviewRound["feeling"] })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200">
                      <option value="">-</option>
                      {FEELING_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-0.5">结果</label>
                    <select value={round.result} onChange={(e) => updateRound(rIdx, { result: e.target.value as InterviewRound["result"] })} className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200">
                      <option value="">-</option>
                      {RESULT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div />
                </div>

                {/* 复盘 */}
                <textarea
                  value={round.feedback ?? ""}
                  onChange={(e) => updateRound(rIdx, { feedback: e.target.value || undefined })}
                  placeholder="复盘/反思..."
                  rows={2}
                  className="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 resize-none"
                />
              </div>
            ))}
          </div>

          {/* 综合信息 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">综合信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">薪资沟通</label>
                <input value={salaryInfo} onChange={(e) => setSalaryInfo(e.target.value)} placeholder="如：25k*16" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-1">Offer 详情</label>
                <input value={offerDetail} onChange={(e) => setOfferDetail(e.target.value)} placeholder="如：base+bonus+股票" className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">下次准备事项</label>
              <textarea value={nextPrepare} onChange={(e) => setNextPrepare(e.target.value)} placeholder="下次面试前要准备的内容..." rows={2} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">备注</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="其他备注信息..." rows={2} className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">取消</button>
          <button
            onClick={handleSubmit}
            disabled={!company.trim() || !position.trim()}
            className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {initial ? "保存修改" : "保存记录"}
          </button>
        </div>
      </div>
    </div>
  );
}
