/**
 * 板块成员管理组件
 * 
 * 功能：
 * - 显示板块成员列表
 * - 添加/移除成员
 * - 设置成员角色（负责人/成员）
 */

'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, Plus, MoreVertical, UserMinus, Crown, User as UserIcon, 
  Loader2, Search, Building, Mail
} from 'lucide-react';

interface Member {
  id: number;
  plateId: number;
  userId: number;
  role: 'leader' | 'member';
  createdAt: string;
  user: {
    id: number;
    realName: string;
    email: string;
    avatar: string | null;
    department: string | null;
    position: string | null;
  } | null;
}

interface User {
  id: number;
  realName: string;
  email: string;
  avatar: string | null;
  department: string | null;
  position: string | null;
}

interface SectionMembersManagerProps {
  plateId: number;
  plateName: string;
}

export function SectionMembersManager({ plateId, plateName }: SectionMembersManagerProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'leader' | 'member'>('member');
  const [submitting, setSubmitting] = useState(false);

  // 获取成员列表
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/solutions/${plateId}/members`);
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.data || []);
      } else {
        toast({
          title: '获取成员失败',
          description: '无法获取板块成员列表',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('获取成员失败:', error);
      toast({
        title: '获取成员失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户
  const searchUsers = async (keyword: string) => {
    if (!keyword.trim()) {
      setUserSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(`/api/users?keyword=${encodeURIComponent(keyword)}&pageSize=10`);
      
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.data?.items || []);
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
    } finally {
      setSearching(false);
    }
  };

  // 添加成员
  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast({
        title: '请选择用户',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/solutions/${plateId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '添加成功',
          description: '成员已添加到板块',
        });
        setAddDialogOpen(false);
        setSelectedUserId(null);
        setUserSearch('');
        setUserSearchResults([]);
        fetchMembers();
      } else {
        toast({
          title: '添加失败',
          description: data.error?.message || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('添加成员失败:', error);
      toast({
        title: '添加失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 移除成员
  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('确定要移除该成员吗？')) return;

    try {
      const response = await fetch(`/api/solutions/${plateId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: '移除成功',
          description: '成员已从板块移除',
        });
        fetchMembers();
      } else {
        const data = await response.json();
        toast({
          title: '移除失败',
          description: data.error?.message || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('移除成员失败:', error);
      toast({
        title: '移除失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 更新成员角色
  const handleUpdateRole = async (memberId: number, role: 'leader' | 'member') => {
    try {
      const response = await fetch(`/api/solutions/${plateId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (response.ok) {
        toast({
          title: '更新成功',
          description: '成员角色已更新',
        });
        fetchMembers();
      } else {
        const data = await response.json();
        toast({
          title: '更新失败',
          description: data.error?.message || '请稍后重试',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('更新角色失败:', error);
      toast({
        title: '更新失败',
        description: '网络错误，请稍后重试',
        variant: 'destructive',
      });
    }
  };

  // 用户搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // 初始加载
  useEffect(() => {
    fetchMembers();
  }, [plateId]);

  // 获取头像fallback
  const getAvatarFallback = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || 'U';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              板块成员
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {plateName} - {members.length} 名成员
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无成员</p>
            <p className="text-xs mt-1">点击上方添加按钮添加成员</p>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user?.avatar || undefined} />
                      <AvatarFallback className="text-xs">
                        {getAvatarFallback(member.user?.realName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {member.user?.realName || '未知用户'}
                        </span>
                        {member.role === 'leader' && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            <Crown className="h-3 w-3 mr-0.5" />
                            负责人
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {member.user?.department && (
                          <span className="flex items-center gap-0.5">
                            <Building className="h-3 w-3" />
                            {member.user.department}
                          </span>
                        )}
                        {member.user?.email && (
                          <span className="flex items-center gap-0.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            {member.user.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {member.role === 'member' && (
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'leader')}>
                          <Crown className="h-4 w-4 mr-2" />
                          设为负责人
                        </DropdownMenuItem>
                      )}
                      {member.role === 'leader' && (
                        <DropdownMenuItem onClick={() => handleUpdateRole(member.id, 'member')}>
                          <UserIcon className="h-4 w-4 mr-2" />
                          设为普通成员
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        移除成员
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* 添加成员对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加板块成员</DialogTitle>
            <DialogDescription>
              搜索并添加成员到 {plateName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>搜索用户</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="输入姓名或邮箱搜索..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>

            {/* 搜索结果 */}
            {userSearchResults.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {userSearchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted transition-colors ${
                        selectedUserId === user.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {getAvatarFallback(user.realName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{user.realName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.department} · {user.email}
                        </div>
                      </div>
                      {selectedUserId === user.id && (
                        <Badge variant="default" className="text-xs">已选择</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="space-y-2">
              <Label>角色</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as 'leader' | 'member')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">普通成员</SelectItem>
                  <SelectItem value="leader">负责人</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
