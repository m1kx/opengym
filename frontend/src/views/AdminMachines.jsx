import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { api } from '../lib/api.js'
import { Button, TextField } from '../components/ui.jsx'

/* Gym machines for the whole instance: point the Coach's agent at a manufacturer's site
   (e.g. https://gym80.de/) and the machines it finds show up as exercises for everyone.
   English-only like the rest of the admin dashboard. */
export default function AdminMachines() {
  const toast = useUI(s => s.toast)
  const loadMachines = useStore(s => s.loadMachines)
  const [d, setD] = useState(null)
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const status = d?.job?.status

  const load = () => api('/api/admin/machines/status').then(setD).catch(e => toast(e.message || 'Failed to load'))
  useEffect(() => { load() }, [])
  // Poll while an import runs; when it finishes, refresh the catalogue the picker reads.
  useEffect(() => {
    if (status !== 'running') return undefined
    const timer = setInterval(load, 3000)
    return () => { clearInterval(timer); loadMachines() }
  }, [status])

  const start = async () => {
    setBusy(true)
    try { await api('/api/admin/machines/import', { method: 'POST', body: JSON.stringify({ url: url.trim() }) }); await load() }
    catch (e) { toast(e.message) }
    setBusy(false)
  }
  const remove = async brand => {
    setBusy(true)
    try { await api('/api/admin/machines/delete', { method: 'POST', body: JSON.stringify({ brand }) }); await load(); loadMachines() }
    catch (e) { toast(e.message) }
    setBusy(false)
  }

  const job = d?.job
  return <div className="card">
    <h2 style={{ margin: '0 0 6px' }}>Machines</h2>
    <div className="muted small" style={{ marginBottom: 10 }}>
      Import a manufacturer's gym machines as exercises for everyone on this instance. Needs the Coach connected with Claude; an import takes a few minutes.
    </div>
    <div className="row" style={{ gap: 8 }}>
      <div className="grow"><TextField value={url} placeholder="https://gym80.de/" disabled={status === 'running'} onChange={e => setUrl(e.target.value)} /></div>
      <Button size="sm" variant="primary" icon="plus" disabled={busy || status === 'running' || !url.trim()} onClick={start}>Import</Button>
    </div>
    {status === 'running' && <div className="small muted" style={{ marginTop: 8 }}>Importing {job.url}… this can take several minutes.</div>}
    {status === 'done' && <div className="small" style={{ marginTop: 8, color: 'var(--green)' }}>Done{job.count != null ? ` (${job.count} machines)` : ''}</div>}
    {status === 'error' && <div className="small" style={{ marginTop: 8, color: 'var(--red)' }}>{job.error || 'Import failed'}</div>}
    {!!d?.brands?.length && <>
      <h4 className="sec">Imported</h4>
      {d.brands.map(b => <div key={b.slug} className="row between" style={{ padding: '6px 2px', borderBottom: '1px solid var(--sep)' }}>
        <div><div className="small" style={{ fontWeight: 600 }}>{b.slug}</div>
          <div className="dim" style={{ fontSize: '.72rem' }}>{b.count} machines · {new Date(b.importedAt).toLocaleDateString()} · {b.url}</div></div>
        <Button size="sm" danger disabled={busy} onClick={() => remove(b.slug)}>Delete</Button>
      </div>)}
    </>}
  </div>
}
