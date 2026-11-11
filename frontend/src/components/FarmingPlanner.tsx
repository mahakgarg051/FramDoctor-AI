"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Calendar,
  Sprout,
  Filter,
  Check,
  Trash2,
  Edit2,
  X,
  ChevronRight,
  Info,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import {
  FarmingTask,
  Farm,
  User,
  ActiveTab,
  TaskPriority,
  TaskCategory,
  CreateTaskInput,
  UpdateTaskInput,
} from "@/types";
import {
  fetchTasks,
  createTask,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  fetchMyFarms,
} from "@/services/api";

interface FarmingPlannerProps {
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
}

const CATEGORY_LABELS: Record<TaskCategory, { label: string; color: string }> = {
  inspection: { label: "Crop Inspection", color: "bg-blue-50 text-blue-800 border-blue-200" },
  irrigation: { label: "Water & Irrigation", color: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  nutrition: { label: "Organic Nutrition", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  protection: { label: "Field Protection", color: "bg-amber-50 text-amber-800 border-amber-200" },
  harvest: { label: "Harvest Prep", color: "bg-purple-50 text-purple-800 border-purple-200" },
  follow_up: { label: "Scan Follow-up", color: "bg-rose-50 text-rose-800 border-rose-200" },
  general: { label: "General Farm Work", color: "bg-slate-50 text-slate-800 border-slate-200" },
};

const PRIORITY_BADGES: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "bg-rose-100 text-rose-800 border-rose-300" },
  high: { label: "High", color: "bg-amber-100 text-amber-800 border-amber-300" },
  medium: { label: "Medium", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  low: { label: "Low", color: "bg-slate-100 text-slate-700 border-slate-200" },
};

export default function FarmingPlanner({
  onSelectTab,
  currentUser,
  onOpenAuth,
}: FarmingPlannerProps) {
  const [tasks, setTasks] = useState<FarmingTask[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<FarmingTask | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFarmId, setFormFarmId] = useState("");
  const [formCrop, setFormCrop] = useState("");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [formPriority, setFormPriority] = useState<TaskPriority>("medium");
  const [formCategory, setFormCategory] = useState<TaskCategory>("inspection");
  const [formNotes, setFormNotes] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (currentUser) {
      loadData();
    } else {
      setTasks([]);
      setFarms([]);
      setLoading(false);
    }
  }, [currentUser]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, farmsRes] = await Promise.all([
        fetchTasks(),
        fetchMyFarms().catch(() => []),
      ]);
      setTasks(tasksRes.tasks || []);
      setFarms(farmsRes);
    } catch (err: any) {
      setError(err?.message || "Could not load farming tasks.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    setEditingTask(null);
    setFormTitle("");
    setFormDescription("");
    setFormFarmId(farms.length > 0 ? farms[0].id : "");
    setFormCrop(farms.length > 0 ? farms[0].crop_name : "");
    setFormDueDate(todayStr);
    setFormPriority("medium");
    setFormCategory("inspection");
    setFormNotes("");
    setModalError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (task: FarmingTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || "");
    setFormFarmId(task.farm_id || "");
    setFormCrop(task.crop || "");
    setFormDueDate(task.due_date);
    setFormPriority(task.priority);
    setFormCategory(task.category);
    setFormNotes(task.notes || "");
    setModalError(null);
    setModalOpen(true);
  };

  const handleFarmSelectChange = (farmId: string) => {
    setFormFarmId(farmId);
    const selected = farms.find((f) => f.id === farmId);
    if (selected) {
      setFormCrop(selected.crop_name);
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setModalError("Please enter a task headline.");
      return;
    }
    if (!formDueDate) {
      setModalError("Please select a due date.");
      return;
    }

    setModalSubmitting(true);
    setModalError(null);

    try {
      if (editingTask) {
        const updateData: UpdateTaskInput = {
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          farm_id: formFarmId || undefined,
          crop: formCrop.trim() || undefined,
          due_date: formDueDate,
          priority: formPriority,
          category: formCategory,
          notes: formNotes.trim() || undefined,
        };
        const updated = await updateTask(editingTask.id, updateData);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        const createData: CreateTaskInput = {
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          farm_id: formFarmId || undefined,
          crop: formCrop.trim() || undefined,
          due_date: formDueDate,
          priority: formPriority,
          category: formCategory,
          notes: formNotes.trim() || undefined,
        };
        const created = await createTask(createData);
        setTasks((prev) => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setModalError(err?.message || "Failed to save farming task.");
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: FarmingTask) => {
    const isCompleted = task.status === "completed";
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: isCompleted ? "pending" : "completed",
                completed_at: isCompleted ? null : new Date().toISOString(),
              }
            : t
        )
      );
      await toggleTaskComplete(task.id, !isCompleted);
    } catch (err) {
      // Revert on error
      loadData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this farming task?")) return;
    try {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      await deleteTask(taskId);
    } catch (err) {
      loadData();
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedFarmId !== "all" && t.farm_id !== selectedFarmId) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    return true;
  });

  const todayTasks = tasks.filter((t) => t.due_date === todayStr && t.status === "pending");
  const overdueTasks = tasks.filter((t) => t.due_date < todayStr && t.status === "pending");
  const upcomingTasks = tasks.filter((t) => t.due_date > todayStr && t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl border border-[#E5EAE2] bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#174D36]">
            <CalendarDays className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#174D36]">Daily Farming Planner</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#55695E]">
            Sign in to schedule crop inspections, track growth stage reminders, organize organic spray
            routines, and keep your farm work synchronized.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={onOpenAuth}
              className="rounded-xl bg-[#16834A] px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#137240]"
            >
              Sign In to Your Planner
            </button>
            <button
              onClick={() => onSelectTab("overview")}
              className="rounded-xl border border-[#D5DDD2] bg-white px-5 py-2.5 text-sm font-semibold text-[#174D36] hover:bg-[#F4F8F4]"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#174D36] tracking-tight">Farming Planner</h1>
            <span className="rounded-full bg-[#E5EFE5] px-2.5 py-0.5 text-xs font-semibold text-[#16834A]">
              Daily & Weekly
            </span>
          </div>
          <p className="mt-1 text-sm text-[#55695E]">
            Personalized crop inspection schedule, soil nutrition notes, and pest scouting planner.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 rounded-xl bg-[#16834A] px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#137240]"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule New Task</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800">Overdue</span>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-900">{overdueTasks.length}</div>
          <div className="text-[11px] text-rose-700">Requires immediate attention</div>
        </div>

        <div className="rounded-2xl border border-[#D1E7D1] bg-[#E5EFE5] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#174D36]">Today&apos;s Focus</span>
            <Clock className="h-4 w-4 text-[#16834A]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#174D36]">{todayTasks.length}</div>
          <div className="text-[11px] text-[#55695E]">Scheduled for today</div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800">Upcoming</span>
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{upcomingTasks.length}</div>
          <div className="text-[11px] text-blue-700">Next 7 days</div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{completedTasks.length}</div>
          <div className="text-[11px] text-emerald-700">Tasks logged done</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E5EAE2] bg-white p-3 shadow-xs">
        {/* Status filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter("all")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-[#174D36] text-white"
                : "bg-[#F4F8F4] text-[#55695E] hover:text-[#174D36]"
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "pending"
                ? "bg-[#174D36] text-white"
                : "bg-[#F4F8F4] text-[#55695E] hover:text-[#174D36]"
            }`}
          >
            Pending ({tasks.filter((t) => t.status === "pending").length})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === "completed"
                ? "bg-[#174D36] text-white"
                : "bg-[#F4F8F4] text-[#55695E] hover:text-[#174D36]"
            }`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>

        {/* Farm & Category Selectors */}
        <div className="flex items-center gap-2">
          {farms.length > 0 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="rounded-xl border border-[#D5DDD2] bg-[#F4F8F4] px-3 py-1.5 text-xs font-medium text-[#174D36] focus:border-[#16834A] focus:outline-hidden"
            >
              <option value="all">All Farm Plots</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.crop_name})
                </option>
              ))}
            </select>
          )}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-[#D5DDD2] bg-[#F4F8F4] px-3 py-1.5 text-xs font-medium text-[#174D36] focus:border-[#16834A] focus:outline-hidden"
          >
            <option value="all">All Categories</option>
            <option value="inspection">Crop Inspection</option>
            <option value="irrigation">Water & Irrigation</option>
            <option value="nutrition">Organic Nutrition</option>
            <option value="protection">Field Protection</option>
            <option value="harvest">Harvest Prep</option>
            <option value="follow_up">Scan Follow-up</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-[#E5EAE2] bg-[#F4F8F4]"
            />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-3xl border border-[#E5EAE2] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EFE5] text-[#16834A]">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-[#174D36]">No tasks match this filter</h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[#55695E]">
            {statusFilter === "pending"
              ? "All your scheduled farming tasks are complete! Great work keeping your crops healthy."
              : "No farm activities found in this view. Click 'Schedule New Task' above to add one."}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#16834A] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#137240]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Crop Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "completed";
            const isOverdue = !isCompleted && task.due_date < todayStr;
            const isToday = !isCompleted && task.due_date === todayStr;
            const catBadge = CATEGORY_LABELS[task.category] || CATEGORY_LABELS.general;
            const prioBadge = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-3 rounded-2xl border p-4 shadow-xs transition ${
                  isCompleted
                    ? "border-[#E5EAE2] bg-[#FAFCFA] opacity-75"
                    : isOverdue
                    ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
                    : isToday
                    ? "border-[#D1E7D1] bg-[#F8FDF8] hover:border-[#16834A]"
                    : "border-[#E5EAE2] bg-white hover:border-[#BBDDBB]"
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleComplete(task)}
                  className="mt-0.5 shrink-0 rounded-lg text-[#55695E] transition hover:text-[#16834A]"
                  title={isCompleted ? "Mark as pending" : "Mark as completed"}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-[#16834A]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#A5B3A5] hover:text-[#16834A]" />
                  )}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isCompleted
                          ? "text-[#7A8E81] line-through"
                          : "text-[#174D36]"
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Category pill */}
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${catBadge.color}`}
                    >
                      {catBadge.label}
                    </span>

                    {/* Priority badge */}
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${prioBadge.color}`}
                    >
                      {prioBadge.label}
                    </span>

                    {/* Overdue / Today alert */}
                    {isOverdue && (
                      <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        Overdue ({task.due_date})
                      </span>
                    )}
                    {isToday && (
                      <span className="rounded-md bg-[#16834A] px-2 py-0.5 text-[10px] font-bold text-white">
                        Due Today
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="mt-1 text-xs text-[#55695E] line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7A8E81]">
                    {task.farm_name && (
                      <span className="flex items-center gap-1 font-medium text-[#174D36]">
                        <Sprout className="h-3 w-3 text-[#16834A]" />
                        {task.farm_name}
                      </span>
                    )}
                    {task.crop && (
                      <span className="font-medium text-[#55695E]">
                        Crop: {task.crop}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {task.due_date}
                    </span>
                    {task.completed_at && (
                      <span className="text-emerald-700">
                        Done: {new Date(task.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {task.notes && (
                    <div className="mt-2 rounded-xl bg-[#F4F8F4] p-2 text-xs text-[#55695E] italic">
                      Notes: {task.notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(task)}
                    className="rounded-lg p-1.5 text-[#7A8E81] hover:bg-[#F4F8F4] hover:text-[#174D36]"
                    title="Edit Task"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="rounded-lg p-1.5 text-[#7A8E81] hover:bg-rose-50 hover:text-rose-600"
                    title="Delete Task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Notice Card */}
      <div className="rounded-2xl border border-[#D5DDD2] bg-[#F4F8F4] p-4 text-xs text-[#55695E]">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#16834A]" />
          <div>
            <span className="font-bold text-[#174D36]">Agro-Safety Guidance: </span>
            Use the planner for cultural observations, mechanical weeding, micro-irrigation checks,
            and biological crop care. Avoid scheduling chemical pesticide dosages without local agronomist consultation.
          </div>
        </div>
      </div>

      {/* Add / Edit Task Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-[#E5EAE2] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E5EAE2] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#174D36]">
                  {editingTask ? "Edit Farming Task" : "Schedule New Crop Task"}
                </h3>
                <p className="text-xs text-[#55695E]">
                  Plan field observations, canopy checks, or irrigation routines.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-[#55695E] hover:bg-[#F4F8F4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitTask} className="mt-4 space-y-3.5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#174D36]">
                  Task Headline *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Inspect Tomato lower leaves for Blight spots"
                  className="mt-1 w-full rounded-xl border border-[#D5DDD2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#174D36] focus:border-[#16834A] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Farm Selection & Crop */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Select Farm Plot
                  </label>
                  <select
                    value={formFarmId}
                    onChange={(e) => handleFarmSelectChange(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#D5DDD2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#174D36] focus:border-[#16834A] focus:bg-white focus:outline-hidden"
                  >
                    <option value="">No specific plot</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.crop_name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Crop Name
                  </label>
                  <input
                    type="text"
                    value={formCrop}
                    onChange={(e) => setFormCrop(e.target.value)}
                    placeholder="e.g. Tomato, Potato"
                    className="mt-1 w-full rounded-xl border border-[#D5DDD2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#174D36] focus:border-[#16834A] focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Due Date & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#D5DDD2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#174D36] focus:border-[#16834A] focus:bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#174D36]">
                    Activity Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TaskCategory)}
                    className="mt-1 w-full rounded-xl border border-[#D5DDD2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#174D36] focus:border-[#16834A] focus:bg-white focus:outline-hidden"
                  >
                    <option value="inspection">Crop Inspection</option>
                    <option value="irrigation">Water & Irrigation</option>
                    <option value="nutrition">Organic Nutrition</option>
                    <option value="protection">Field Protection</option>
                    <option value="harvest">Harvest Prep</option>
                    <option value="follow_up">Scan Follow-up</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-[#174D36]">
                  Priority Level
                </label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((prio) => (
                    <button
                      key={prio}
                      type="button"
                      onClick={() => setFormPriority(prio)}
                      className={`rounded-xl border py-1.5 text-xs font-semibold capitalize transition ${
                        formPriority === prio
                          ? PRIORITY_BADGES[prio].color + " ring-2 ring-[#16834A]/30"
                          : "border-[#D5DDD2] bg-white text-[#55695E] hover:bg-[#F4F8F4]"
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#174D36]">
                  Instructions / Steps
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. Check underside of leaves for white mycelium. Prune diseased lower branches."
                  className="mt-1 w-full rounded-xl border border-[#D5DDD2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#174D36] focus:border-[#16834A] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#174D36]">
                  Field Notes / Observations
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Soil moisture currently damp, sunny day expected"
                  className="mt-1 w-full rounded-xl border border-[#D5DDD2] bg-[#F8F8F2] px-3 py-2 text-xs text-[#174D36] focus:border-[#16834A] focus:bg-white focus:outline-hidden"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#D5DDD2] px-4 py-2 text-xs font-semibold text-[#55695E] hover:bg-[#F4F8F4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="flex items-center gap-1.5 rounded-xl bg-[#16834A] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#137240] disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <span>Saving...</span>
                  ) : editingTask ? (
                    <span>Update Task</span>
                  ) : (
                    <span>Add to Planner</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
