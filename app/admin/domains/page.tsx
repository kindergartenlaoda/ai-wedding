"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Pencil,
    Trash2,
    GripVertical,
    Camera,
    Baby,
    CreditCard,
    Palette,
    User,
    Wand2,
    Mountain,
    ShoppingBag,
    Globe,
    Star,
    Heart,
    Zap,
    Image as ImageIcon,
    Music,
    Film,
    Book,
    type LucideIcon,
} from 'lucide-react';

// ------------------------------------------------------------------
// Icon map: string → Lucide component
// ------------------------------------------------------------------
const ICON_MAP: Record<string, LucideIcon> = {
    Camera, Baby, CreditCard, Palette, User, Wand2, Mountain,
    ShoppingBag, Globe, Star, Heart, Zap, Image: ImageIcon,
    Music, Film, Book,
};
const AVAILABLE_ICONS = Object.keys(ICON_MAP);

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface DomainItem {
    id: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    cover_image: string | null;
    is_active: boolean;
    sort_order: number;
    require_face_detection: boolean;
    created_at: string;
    updated_at: string;
}

interface DomainFormData {
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    cover_image: string;
    is_active: boolean;
    sort_order: number;
    require_face_detection: boolean;
}

const EMPTY_FORM: DomainFormData = {
    slug: '',
    name: '',
    description: '',
    icon: 'Camera',
    color: 'from-pink-500 to-rose-500',
    cover_image: '',
    is_active: true,
    sort_order: 0,
    require_face_detection: false,
};

// ------------------------------------------------------------------
// Page Component
// ------------------------------------------------------------------
export default function AdminDomainsPage() {
    const router = useRouter();
    const [domains, setDomains] = useState<DomainItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<DomainFormData>(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    // ---------- Load ----------
    const loadDomains = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const res = await fetch('/api/admin/domains', { credentials: 'include' });
            if (res.status === 401) { router.push('/'); return; }
            if (res.status === 403) { setError('访问被拒绝，需要管理员权限。'); return; }
            if (!res.ok) throw new Error('加载域列表失败');
            const data = await res.json();
            setDomains(data.data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载域列表失败');
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    useEffect(() => { loadDomains(); }, [loadDomains]);

    // ---------- Create / Update ----------
    const handleSave = async () => {
        if (!form.slug || !form.name) return;
        setSaving(true);
        try {
            const url = editingId
                ? `/api/admin/domains/${editingId}`
                : '/api/admin/domains';
            const method = editingId ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.status === 401) { router.push('/'); return; }
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || '保存失败');
            }
            setIsFormOpen(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
            await loadDomains();
        } catch (err) {
            alert(err instanceof Error ? err.message : '保存失败');
        } finally {
            setSaving(false);
        }
    };

    // ---------- Delete ----------
    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/domains/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.status === 401) { router.push('/'); return; }
            if (!res.ok) throw new Error('删除失败');
            await loadDomains();
        } catch (err) {
            alert(err instanceof Error ? err.message : '删除失败');
        }
    };

    // ---------- Toggle Active ----------
    const handleToggle = async (domain: DomainItem) => {
        try {
            const res = await fetch(`/api/admin/domains/${domain.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !domain.is_active }),
            });
            if (!res.ok) throw new Error('切换状态失败');
            await loadDomains();
        } catch (err) {
            alert(err instanceof Error ? err.message : '切换状态失败');
        }
    };

    // ---------- Open edit ----------
    const openEdit = (domain: DomainItem) => {
        setEditingId(domain.id);
        setForm({
            slug: domain.slug,
            name: domain.name,
            description: domain.description,
            icon: domain.icon,
            color: domain.color,
            cover_image: domain.cover_image || '',
            is_active: domain.is_active,
            sort_order: domain.sort_order,
            require_face_detection: domain.require_face_detection,
        });
        setIsFormOpen(true);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM, sort_order: domains.length });
        setIsFormOpen(true);
    };

    // ---------- Render ----------
    if (error) {
        return (
            <AdminLayout>
                <div className="p-4 text-red-800 bg-red-50 rounded-lg border border-red-200">
                    {error}
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-8 p-4">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">域管理</h1>
                        <p className="text-muted-foreground">管理 AI 写真风格域（婚纱照、儿童照等）</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 w-4 h-4" />
                        新建域
                    </Button>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="py-12 text-center text-muted-foreground">加载中...</div>
                ) : domains.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">暂无域数据</div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium w-8"></th>
                                    <th className="px-4 py-3 font-medium">排序</th>
                                    <th className="px-4 py-3 font-medium">封面</th>
                                    <th className="px-4 py-3 font-medium">Slug</th>
                                    <th className="px-4 py-3 font-medium">名称</th>
                                    <th className="px-4 py-3 font-medium">描述</th>
                                    <th className="px-4 py-3 font-medium">图标</th>
                                    <th className="px-4 py-3 font-medium">状态</th>
                                    <th className="px-4 py-3 font-medium">识别人物</th>
                                    <th className="px-4 py-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {domains.map((domain) => {
                                    const IconComp = ICON_MAP[domain.icon] || Globe;
                                    return (
                                        <tr key={domain.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-muted-foreground">
                                                <GripVertical className="w-4 h-4" />
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                                                {domain.sort_order}
                                            </td>
                                            <td className="px-4 py-3">
                                                {domain.cover_image ? (
                                                    <div className="relative w-12 h-9 rounded overflow-hidden bg-muted">
                                                        <Image
                                                            src={domain.cover_image}
                                                            alt={domain.name}
                                                            fill
                                                            className="object-cover"
                                                            sizes="48px"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-9 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">{domain.slug}</td>
                                            <td className="px-4 py-3 font-medium">{domain.name}</td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                                                {domain.description}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <IconComp className="w-4 h-4" />
                                                    <span className="text-xs text-muted-foreground">{domain.icon}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Switch
                                                    checked={domain.is_active}
                                                    onCheckedChange={() => handleToggle(domain)}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <Switch
                                                    checked={domain.require_face_detection}
                                                    disabled
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openEdit(domain)}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    确定要删除域 &quot;{domain.name}&quot; ({domain.slug}) 吗？此操作不可撤销。
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>取消</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(domain.id)}>
                                                                    删除
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create / Edit Dialog */}
            <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) { setIsFormOpen(false); setEditingId(null); } }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? '编辑域' : '新建域'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        {/* Slug */}
                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug <span className="text-destructive">*</span></Label>
                            <Input
                                id="slug"
                                placeholder="wedding"
                                value={form.slug}
                                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                disabled={!!editingId}
                            />
                            <p className="text-xs text-muted-foreground">URL 路由标识，创建后不可修改</p>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">名称 <span className="text-destructive">*</span></Label>
                            <Input
                                id="name"
                                placeholder="AI 婚纱照"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">描述</Label>
                            <Input
                                id="description"
                                placeholder="唯美婚纱、旅拍、中式喜庆，多风格一键生成"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>

                        {/* Icon */}
                        <div className="space-y-2">
                            <Label>图标</Label>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_ICONS.map((iconName) => {
                                    const Ic = ICON_MAP[iconName];
                                    const selected = form.icon === iconName;
                                    return (
                                        <button
                                            key={iconName}
                                            type="button"
                                            onClick={() => setForm({ ...form, icon: iconName })}
                                            className={`p-2 rounded-md border transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted'}`}
                                            title={iconName}
                                        >
                                            <Ic className="w-4 h-4" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color */}
                        <div className="space-y-2">
                            <Label htmlFor="color">渐变色</Label>
                            <Input
                                id="color"
                                placeholder="from-pink-500 to-rose-500"
                                value={form.color}
                                onChange={(e) => setForm({ ...form, color: e.target.value })}
                            />
                            <div className={`h-6 rounded bg-gradient-to-r ${form.color}`} />
                        </div>

                        {/* Cover Image */}
                        <ImageUploadField
                            currentUrl={form.cover_image}
                            onUrlChange={(url) => setForm({ ...form, cover_image: url })}
                        />

                        {/* Sort Order */}
                        <div className="space-y-2">
                            <Label htmlFor="sort_order">排序</Label>
                            <Input
                                id="sort_order"
                                type="number"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                            />
                        </div>

                        {/* Active */}
                        <div className="flex items-center gap-3">
                            <Switch
                                id="is_active"
                                checked={form.is_active}
                                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                            />
                            <Label htmlFor="is_active">启用</Label>
                        </div>

                        {/* Require Face Detection */}
                        <div className="flex items-center gap-3">
                            <Switch
                                id="require_face_detection"
                                checked={form.require_face_detection}
                                onCheckedChange={(checked) => setForm({ ...form, require_face_detection: checked })}
                            />
                            <Label htmlFor="require_face_detection">需要识别人物</Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsFormOpen(false); setEditingId(null); }}>
                            取消
                        </Button>
                        <Button onClick={handleSave} disabled={saving || !form.slug || !form.name}>
                            {saving ? '保存中...' : editingId ? '更新' : '创建'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
