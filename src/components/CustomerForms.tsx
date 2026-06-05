import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clipboard, Code2, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { cn } from '../lib/utils';

type CustomerFormField = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'number';
  required?: boolean;
  options?: string[];
};

type CustomerForm = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused';
  fields: CustomerFormField[];
  defaultTags: string[];
  createLead: boolean;
  successMessage: string;
  submissionsCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

const DEFAULT_FIELDS: CustomerFormField[] = [
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'company', label: 'Company', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'whatsapp', label: 'WhatsApp', type: 'tel' },
  { key: 'country', label: 'Country', type: 'text' },
  { key: 'message', label: 'Message', type: 'textarea' }
];

const emptyDraft = (): CustomerForm => ({
  id: '',
  name: '',
  description: '',
  status: 'active',
  fields: DEFAULT_FIELDS,
  defaultTags: ['website-form'],
  createLead: true,
  successMessage: 'Thanks. We have received your submission.'
});

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmbedHtml(form: CustomerForm, endpoint: string) {
  const successMessageJson = JSON.stringify(form.successMessage || 'Thanks. We have received your submission.');
  const inputs = form.fields.map(field => {
    const label = `<label style="display:block;margin:12px 0 6px;font-weight:600;">${escapeHtml(field.label)}${field.required ? ' *' : ''}</label>`;
    if (field.type === 'textarea') {
      return `${label}<textarea name="${escapeHtml(field.key)}" ${field.required ? 'required' : ''} rows="4" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;"></textarea>`;
    }
    if (field.type === 'select') {
      const options = (field.options || []).map(option => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('');
      return `${label}<select name="${escapeHtml(field.key)}" ${field.required ? 'required' : ''} style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;">${options}</select>`;
    }
    return `${label}<input name="${escapeHtml(field.key)}" type="${escapeHtml(field.type)}" ${field.required ? 'required' : ''} style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:8px;" />`;
  }).join('\n  ');

  const formId = `tq-form-${escapeHtml(form.id || 'customer-form')}`;
  return `<form id="${formId}" method="POST" action="${escapeHtml(endpoint)}" style="max-width:520px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;">
  <h3 style="margin:0 0 8px;">${escapeHtml(form.name || 'Contact Form')}</h3>
  ${form.description ? `<p style="margin:0 0 16px;color:#64748b;">${escapeHtml(form.description)}</p>` : ''}
  ${inputs}
  <button type="submit" style="margin-top:16px;padding:10px 16px;border:0;border-radius:8px;background:#0891b2;color:white;font-weight:700;cursor:pointer;">Submit</button>
  <div data-result style="margin-top:12px;color:#0f766e;font-weight:600;"></div>
</form>
<script>
(function(){
  var form = document.getElementById('${formId}');
  if (!form) return;
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    var result = form.querySelector('[data-result]');
    if (result) result.textContent = 'Submitting...';
    var payload = {};
    new FormData(form).forEach(function(value, key) { payload[key] = value; });
    try {
      var response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      var data = await response.json().catch(function(){ return {}; });
      if (!response.ok) throw new Error(data.error || 'Submit failed');
      form.reset();
      if (result) result.textContent = data.message || ${successMessageJson};
    } catch (error) {
      if (result) {
        result.style.color = '#b91c1c';
        result.textContent = error.message || 'Submit failed';
      }
    }
  });
})();
</script>`;
}

export function CustomerForms() {
  const { language, notify } = useStore();
  const [forms, setForms] = useState<CustomerForm[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CustomerForm>(emptyDraft());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const token = localStorage.getItem('token');
  const selectedForm = forms.find(form => form.id === selectedId) || null;
  const isNew = !draft.id;
  const publicEndpoint = draft.id ? `${window.location.origin}/api/public/customer-forms/${draft.id}/submit` : '';
  const embedHtml = useMemo(() => draft.id ? buildEmbedHtml(draft, publicEndpoint) : '', [draft, publicEndpoint]);

  const fetchForms = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/customer-forms', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch forms');
      setForms(data);
      if (!selectedId && data[0]) {
        setSelectedId(data[0].id);
        setDraft(data[0]);
      }
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '加载表单失败。' : 'Failed to load forms.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  useEffect(() => {
    if (selectedForm) setDraft({ ...selectedForm, fields: selectedForm.fields || DEFAULT_FIELDS, defaultTags: selectedForm.defaultTags || [] });
  }, [selectedId]);

  const updateField = (index: number, updates: Partial<CustomerFormField>) => {
    setDraft(current => ({
      ...current,
      fields: current.fields.map((field, idx) => idx === index ? { ...field, ...updates } : field)
    }));
  };

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    notify(language === 'zh' ? `${label} 已复制。` : `${label} copied.`, 'success');
  };

  const saveForm = async () => {
    if (!draft.name.trim()) {
      notify(language === 'zh' ? '请填写表单名称。' : 'Please enter a form name.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(draft.id ? `/api/customer-forms/${draft.id}` : '/api/customer-forms', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(draft)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save form');
      setForms(current => draft.id ? current.map(form => form.id === data.id ? data : form) : [data, ...current]);
      setSelectedId(data.id);
      setDraft(data);
      notify(language === 'zh' ? '客户表单已保存。' : 'Customer form saved.', 'success');
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '保存表单失败。' : 'Failed to save form.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteForm = async () => {
    if (!draft.id) return;
    if (!window.confirm(language === 'zh' ? '确定删除这个客户表单吗？历史提交记录也会删除。' : 'Delete this customer form and its submissions?')) return;
    try {
      const res = await fetch(`/api/customer-forms/${draft.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete form');
      const nextForms = forms.filter(form => form.id !== draft.id);
      setForms(nextForms);
      setSelectedId(nextForms[0]?.id || null);
      setDraft(nextForms[0] || emptyDraft());
      notify(language === 'zh' ? '客户表单已删除。' : 'Customer form deleted.', 'success');
    } catch (error: any) {
      notify(error?.message || (language === 'zh' ? '删除表单失败。' : 'Failed to delete form.'), 'error');
    }
  };

  return (
    <div className="flex-1 min-h-0 bg-slate-950 text-slate-100 border-t border-slate-800 flex">
      <aside className="w-[360px] border-r border-slate-800 bg-slate-900/80 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold">
                <FileText className="h-5 w-5 text-cyan-400" />
                {language === 'zh' ? '客户表单' : 'Customer Forms'}
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {language === 'zh' ? '创建网站嵌入表单，自动收集客户与线索。' : 'Create embeddable forms that capture clients and leads.'}
              </p>
            </div>
            <button
              onClick={() => { setSelectedId(null); setDraft(emptyDraft()); }}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-bold text-white hover:bg-cyan-500"
            >
              <Plus className="h-4 w-4" />
              {language === 'zh' ? '新建' : 'New'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : forms.length === 0 ? (
            <div className="rounded-lg border border-slate-800 p-4 text-sm text-slate-500">{language === 'zh' ? '暂无表单。点击新建开始。' : 'No forms yet. Create one to begin.'}</div>
          ) : forms.map(form => (
            <button
              key={form.id}
              onClick={() => setSelectedId(form.id)}
              className={cn(
                'mb-2 w-full rounded-lg border p-3 text-left transition-colors',
                selectedId === form.id ? 'border-cyan-500/50 bg-cyan-950/25' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate font-bold text-slate-100">{form.name}</div>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold', form.status === 'active' ? 'border-emerald-500/40 text-emerald-300' : 'border-slate-700 text-slate-400')}>
                  {form.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500">{form.submissionsCount || 0} submissions</div>
              <div className="mt-2 truncate font-mono text-[11px] text-slate-600">{form.id}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold">{isNew ? (language === 'zh' ? '新建客户表单' : 'Create Form') : draft.name}</h2>
                <p className="mt-1 text-xs text-slate-500">{language === 'zh' ? '表单提交后会自动创建或关联客户，并根据配置创建 Lead。' : 'Submissions create or link clients and optionally create a lead.'}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isNew && (
                  <button onClick={deleteForm} className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                    {language === 'zh' ? '删除' : 'Delete'}
                  </button>
                )}
                <button onClick={saveForm} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {language === 'zh' ? '保存' : 'Save'}
                </button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{language === 'zh' ? '表单名称' : 'Form Name'}</span>
                <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Status</span>
                <select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as CustomerForm['status'] })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500">
                  <option value="active">{language === 'zh' ? '启用' : 'Active'}</option>
                  <option value="paused">{language === 'zh' ? '暂停' : 'Paused'}</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{language === 'zh' ? '描述' : 'Description'}</span>
                <textarea value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              </label>
            </div>

            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold">{language === 'zh' ? '字段' : 'Fields'}</h3>
                <button
                  onClick={() => setDraft(current => ({ ...current, fields: [...current.fields, { key: `custom_${current.fields.length + 1}`, label: 'Custom Field', type: 'text' }] }))}
                  className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {language === 'zh' ? '添加字段' : 'Add Field'}
                </button>
              </div>
              <div className="space-y-2">
                {draft.fields.map((field, index) => (
                  <div key={`${field.key}-${index}`} className="grid grid-cols-[1fr_1fr_120px_80px_36px] gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-2">
                    <input value={field.key} onChange={e => updateField(index, { key: e.target.value })} placeholder="key" className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs outline-none focus:border-cyan-500" />
                    <input value={field.label} onChange={e => updateField(index, { label: e.target.value })} placeholder="Label" className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs outline-none focus:border-cyan-500" />
                    <select value={field.type} onChange={e => updateField(index, { type: e.target.value as CustomerFormField['type'] })} className="rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-xs outline-none focus:border-cyan-500">
                      <option value="text">text</option>
                      <option value="email">email</option>
                      <option value="tel">tel</option>
                      <option value="textarea">textarea</option>
                      <option value="number">number</option>
                      <option value="select">select</option>
                    </select>
                    <label className="flex items-center justify-center gap-1 text-xs text-slate-400">
                      <input type="checkbox" checked={!!field.required} onChange={e => updateField(index, { required: e.target.checked })} />
                      {language === 'zh' ? '必填' : 'Req'}
                    </label>
                    <button onClick={() => setDraft(current => ({ ...current, fields: current.fields.filter((_, idx) => idx !== index) }))} className="rounded border border-slate-800 text-slate-500 hover:border-red-500/40 hover:text-red-300">
                      <Trash2 className="mx-auto h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{language === 'zh' ? '默认标签' : 'Default Tags'}</span>
                <div className="mt-1 flex min-h-[40px] flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1">
                  {draft.defaultTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">
                      {tag}
                      <button onClick={() => setDraft(current => ({ ...current, defaultTags: current.defaultTags.filter(item => item !== tag) }))}>x</button>
                    </span>
                  ))}
                  <input value={tagDraft} onChange={e => setTagDraft(e.target.value)} onKeyDown={e => {
                    if (e.key === 'Enter' && tagDraft.trim()) {
                      e.preventDefault();
                      setDraft(current => ({ ...current, defaultTags: Array.from(new Set([...current.defaultTags, tagDraft.trim()])) }));
                      setTagDraft('');
                    }
                  }} placeholder={language === 'zh' ? '回车添加标签' : 'Enter to add tag'} className="min-w-[120px] flex-1 bg-transparent text-sm outline-none" />
                </div>
              </div>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{language === 'zh' ? '提交成功提示' : 'Success Message'}</span>
                <input value={draft.successMessage} onChange={e => setDraft({ ...draft, successMessage: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={draft.createLead} onChange={e => setDraft({ ...draft, createLead: e.target.checked })} />
                {language === 'zh' ? '提交后自动创建 Lead/Deal' : 'Create a Lead/Deal on submission'}
              </label>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Code2 className="h-4 w-4 text-cyan-400" /> {language === 'zh' ? 'API 与嵌入' : 'API & Embed'}</h3>
              {draft.id ? (
                <>
                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">POST endpoint</div>
                    <div className="mt-1 break-all font-mono text-xs text-cyan-200">{publicEndpoint}</div>
                    <button onClick={() => copyText(publicEndpoint, 'API URL')} className="mt-3 inline-flex items-center gap-2 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:text-white">
                      <Clipboard className="h-3.5 w-3.5" />
                      {language === 'zh' ? '复制 API 地址' : 'Copy API URL'}
                    </button>
                  </div>
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">HTML Embed</span>
                      <button onClick={() => copyText(embedHtml, 'HTML')} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:text-white">
                        <Clipboard className="h-3.5 w-3.5" />
                        {language === 'zh' ? '复制' : 'Copy'}
                      </button>
                    </div>
                    <pre className="max-h-[360px] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">{embedHtml}</pre>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-500">{language === 'zh' ? '保存表单后即可复制 API 地址和 HTML 嵌入代码。' : 'Save the form to copy its API endpoint and embed HTML.'}</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Check className="h-4 w-4 text-emerald-400" /> {language === 'zh' ? '来源写入规则' : 'Source Rules'}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {language === 'zh'
                  ? '从此表单提交创建或关联的客户/线索，会写入来源：form、表单 ID 和表单名称。客户列表、客户详情和 Lead 数据都能显示该来源。'
                  : 'Clients and leads created or linked by this form are saved with source type form, form ID, and form name.'}
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
