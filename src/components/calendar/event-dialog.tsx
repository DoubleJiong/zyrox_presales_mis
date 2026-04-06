'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserSelect, type UserOption } from '@/components/ui/user-select';
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  Trash2,
  CheckSquare,
  Users,
  Loader2,
  Plus,
  X,
  Repeat,
  Link,
} from 'lucide-react';
import { CalendarEvent, formatRepeatLabel } from './calendar-types';

interface EventDialogProps {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  defaultDate?: string;
  defaultTime?: string;
  onSave: (event: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const eventTypeColors: Record<string, { bg: string; border: string; text: string }> = {
  todo: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600' },
  schedule: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-600' },
};

export function EventDialog({
  open,
  onClose,
  event,
  defaultDate,
  defaultTime,
  onSave,
  onDelete,
}: EventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [participantCandidateId, setParticipantCandidateId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'schedule' as 'todo' | 'schedule',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    participants: [] as Array<{ userId: number; userName: string }>,
    reminderEnabled: false,
    reminderType: 'at_time',
    repeatEnabled: false,
    repeatType: 'weekly',
    repeatInterval: 1,
    repeatEndDate: '',
  });

  // 初始化表单
  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title,
        type: event.type,
        startDate: event.startDate,
        startTime: event.startTime || '',
        endDate: event.endDate || event.startDate,
        endTime: event.endTime || '',
        allDay: event.allDay,
        location: event.location || '',
        description: event.description || '',
        priority: event.priority || 'medium',
        status: event.status,
        participants: event.participants || [],
        reminderEnabled: !!event.reminder?.enabled,
        reminderType: event.reminder?.remindType || 'at_time',
        repeatEnabled: !!event.repeat,
        repeatType: event.repeat?.type || 'weekly',
        repeatInterval: event.repeat?.interval || 1,
        repeatEndDate: event.repeat?.endDate || '',
      });
    } else {
      // 新建事件
      const today = new Date();
      setFormData({
        title: '',
        type: 'schedule',
        startDate: defaultDate || today.toISOString().split('T')[0],
        startTime: defaultTime || '',
        endDate: defaultDate || today.toISOString().split('T')[0],
        endTime: '',
        allDay: !defaultTime,
        location: '',
        description: '',
        priority: 'medium',
        status: 'pending',
        participants: [],
        reminderEnabled: false,
        reminderType: 'at_time',
        repeatEnabled: false,
        repeatType: 'weekly',
        repeatInterval: 1,
        repeatEndDate: '',
      });
    }
    setParticipantCandidateId(null);
  }, [event, defaultDate, defaultTime, open]);

  useEffect(() => {
    if (!open || formData.type !== 'schedule') {
      return;
    }

    let cancelled = false;

    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users?pageSize=100');
        const payload = await response.json();
        const userList = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        if (!cancelled) {
          setAvailableUsers(userList);
        }
      } catch (error) {
        console.error('Load schedule participants error:', error);
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [formData.type, open]);

  const handleAddParticipant = () => {
    if (!participantCandidateId) {
      return;
    }

    const selectedUser = availableUsers.find((user) => user.id === participantCandidateId);
    if (!selectedUser) {
      return;
    }

    setFormData((current) => {
      if (current.participants.some((participant) => participant.userId === selectedUser.id)) {
        return current;
      }

      return {
        ...current,
        participants: [
          ...current.participants,
          {
            userId: selectedUser.id,
            userName: selectedUser.realName,
          },
        ],
      };
    });
    setParticipantCandidateId(null);
  };

  const handleRemoveParticipant = (participantId: number) => {
    setFormData((current) => ({
      ...current,
      participants: current.participants.filter((participant) => participant.userId !== participantId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...formData,
        id: event?.id,
        participants: formData.type === 'schedule' ? formData.participants : undefined,
        reminder: formData.type === 'schedule' && formData.reminderEnabled
          ? {
              enabled: true,
              remindType: formData.reminderType,
            }
          : null,
        repeat: formData.type === 'schedule' && formData.repeatEnabled
          ? {
              type: formData.repeatType,
              interval: formData.repeatInterval,
              endDate: formData.repeatEndDate || undefined,
            }
          : null,
      });
      onClose();
    } catch (error) {
      console.error('Save event error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event?.id || !onDelete) return;
    if (!confirm('确定要删除这个事项吗？')) return;

    setLoading(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (error) {
      console.error('Delete event error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!event?.id) return;
    
    setLoading(true);
    try {
      await onSave({
        ...formData,
        id: event.id,
        status: event.status === 'completed' ? 'pending' : 'completed',
      });
      onClose();
    } catch (error) {
      console.error('Toggle complete error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEdit = !!event;
  const isReadOnlySharedSchedule = isEdit && formData.type === 'schedule' && event?.isOwner === false;
  const colorStyle = eventTypeColors[formData.type];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? '编辑事项' : '新建事项'}
            <Badge variant="outline" className={`${colorStyle.bg} ${colorStyle.border} ${colorStyle.text}`}>
              {formData.type === 'todo' ? '待办' : '日程'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* 类型选择 */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={formData.type === 'schedule' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, type: 'schedule' })}
              className="flex-1"
              disabled={isReadOnlySharedSchedule}
            >
              <Calendar className="h-4 w-4 mr-2" />
              日程
            </Button>
            <Button
              type="button"
              variant={formData.type === 'todo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, type: 'todo' })}
              className="flex-1"
              disabled={isReadOnlySharedSchedule}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              待办
            </Button>
          </div>

          {/* 标题 */}
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              placeholder="输入事项标题"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              autoFocus
              disabled={isReadOnlySharedSchedule}
            />
          </div>

          {/* 全天事件 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="allDay"
              checked={formData.allDay}
              onCheckedChange={(checked) => setFormData({ ...formData, allDay: !!checked })}
              disabled={isReadOnlySharedSchedule}
            />
            <Label htmlFor="allDay" className="text-sm">全天</Label>
          </div>

          {/* 时间设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                开始日期
              </Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                disabled={isReadOnlySharedSchedule}
              />
            </div>
            {!formData.allDay && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  开始时间
                </Label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  disabled={isReadOnlySharedSchedule}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={isReadOnlySharedSchedule}
              />
            </div>
            {!formData.allDay && (
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  disabled={isReadOnlySharedSchedule}
                />
              </div>
            )}
          </div>

          {/* 待办特有字段：优先级 */}
          {formData.type === 'todo' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                优先级
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                disabled={isReadOnlySharedSchedule}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      紧急
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      高
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      中
                    </div>
                  </SelectItem>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gray-500" />
                      低
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 地点 */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              地点
            </Label>
            <Input
              placeholder="输入地点（可选）"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              disabled={isReadOnlySharedSchedule}
            />
          </div>

          {formData.type === 'schedule' && (
            <div className="space-y-3 rounded-lg border p-3">
              {!event?.isOwner && isEdit && (
                <p className="text-xs text-muted-foreground">您是协作参与人，可查看该日程，但不能直接修改或删除。</p>
              )}

              {event?.relatedType === 'task' && (
                <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Link className="h-3.5 w-3.5" />
                    <span>该日程来自任务联动</span>
                  </div>
                  <Button type="button" variant="link" className="h-auto p-0" asChild>
                    <a href="/tasks?scope=mine">打开任务中心</a>
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  参与人
                </Label>
                <div className="flex gap-2">
                  <UserSelect
                    users={availableUsers}
                    value={participantCandidateId}
                    onChange={(value) => setParticipantCandidateId(typeof value === 'number' ? value : value ? Number(value) : null)}
                    placeholder="选择参与人"
                    emptyText="暂无可选人员"
                    disabled={isReadOnlySharedSchedule}
                  />
                  <Button type="button" variant="outline" onClick={handleAddParticipant} disabled={isReadOnlySharedSchedule}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加
                  </Button>
                </div>
                {formData.participants.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.participants.map((participant) => (
                      <Badge key={participant.userId} variant="secondary" className="gap-1 pr-1">
                        <span>{participant.userName}</span>
                        <button
                          type="button"
                          className="rounded-sm p-0.5 hover:bg-muted-foreground/10"
                          onClick={() => handleRemoveParticipant(participant.userId)}
                          aria-label={`移除${participant.userName}`}
                          disabled={isReadOnlySharedSchedule}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">未添加参与人时，该日程默认为个人日程。</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>提醒方式</Label>
                <Select
                  value={formData.reminderEnabled ? formData.reminderType : 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setFormData({ ...formData, reminderEnabled: false });
                      return;
                    }

                    setFormData({
                      ...formData,
                      reminderEnabled: true,
                      reminderType: value,
                    });
                  }}
                  disabled={isReadOnlySharedSchedule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择提醒方式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不设置提醒</SelectItem>
                    <SelectItem value="at_time">开始时提醒</SelectItem>
                    <SelectItem value="30_minutes_before">提前 30 分钟</SelectItem>
                    <SelectItem value="1_day_before">提前 1 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  重复规则
                </Label>
                <Select
                  value={formData.repeatEnabled ? formData.repeatType : 'none'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setFormData({ ...formData, repeatEnabled: false });
                      return;
                    }

                    setFormData({
                      ...formData,
                      repeatEnabled: true,
                      repeatType: value,
                    });
                  }}
                  disabled={isReadOnlySharedSchedule}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择重复规则" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">不重复</SelectItem>
                    <SelectItem value="daily">每天重复</SelectItem>
                    <SelectItem value="weekly">每周重复</SelectItem>
                    <SelectItem value="monthly">每月重复</SelectItem>
                    <SelectItem value="yearly">每年重复</SelectItem>
                  </SelectContent>
                </Select>

                {formData.repeatEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>重复间隔</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.repeatInterval}
                        onChange={(e) => setFormData({
                          ...formData,
                          repeatInterval: Math.max(1, Number.parseInt(e.target.value || '1', 10) || 1),
                        })}
                        disabled={isReadOnlySharedSchedule}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>结束日期</Label>
                      <Input
                        type="date"
                        value={formData.repeatEndDate}
                        onChange={(e) => setFormData({ ...formData, repeatEndDate: e.target.value })}
                        disabled={isReadOnlySharedSchedule}
                      />
                    </div>
                  </div>
                )}

                {isEdit && event?.repeat && (
                  <p className="text-xs text-muted-foreground">当前规则：{formatRepeatLabel(event.repeat)}</p>
                )}
              </div>
            </div>
          )}

          {/* 描述 */}
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              placeholder="输入详细描述（可选）"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={isReadOnlySharedSchedule}
            />
          </div>

          {/* 操作按钮 */}
          <DialogFooter className="gap-2 sm:gap-0">
            {isEdit && !isReadOnlySharedSchedule && (
              <>
                {formData.type === 'todo' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleToggleComplete}
                    disabled={loading}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {event?.status === 'completed' ? '取消完成' : '标记完成'}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              </>
            )}
            {isReadOnlySharedSchedule ? (
              <Button type="button" onClick={onClose}>关闭</Button>
            ) : (
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
