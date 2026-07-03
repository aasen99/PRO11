'use client'

import React from 'react'
import { Edit, Save, X } from 'lucide-react'

export interface AdminMatchCardMatch {
  id: string
  team1_name: string
  team2_name: string
  status: string
  score1?: number
  score2?: number
  scheduled_time?: string
  submitted_by?: string
  team1_submitted_score1?: number | null
  team1_submitted_score2?: number | null
  team2_submitted_score1?: number | null
  team2_submitted_score2?: number | null
  team1_proof_url?: string | null
  team2_proof_url?: string | null
}

interface MatchLogEntry {
  id?: string
  action: string
  actor_name?: string
  old_score1?: number | null
  old_score2?: number | null
  new_score1?: number | null
  new_score2?: number | null
  created_at: string
}

interface EditForm {
  score1?: number
  score2?: number
  scheduled_time?: string
  status?: string
}

interface AdminMatchCardProps {
  match: AdminMatchCardMatch
  metaLine?: string | null
  isEditing: boolean
  editForm: EditForm
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>
  selected: boolean
  onToggleSelect: () => void
  onStartEdit: () => void
  onSave: () => void
  onCancel: () => void
  onWalkover: (winner: 'team1' | 'team2') => void
  matchLog?: MatchLogEntry[]
  locale: string
  isEnglish: boolean
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string, match: AdminMatchCardMatch) => string
}

function ProofLinks({ match, isEnglish }: { match: AdminMatchCardMatch; isEnglish: boolean }) {
  if (!match.team1_proof_url && !match.team2_proof_url) return null
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {match.team1_proof_url && (
        <a
          href={match.team1_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          📷 {match.team1_name}
        </a>
      )}
      {match.team2_proof_url && (
        <a
          href={match.team2_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          📷 {match.team2_name}
        </a>
      )}
    </div>
  )
}

export default function AdminMatchCard({
  match,
  metaLine,
  isEditing,
  editForm,
  setEditForm,
  selected,
  onToggleSelect,
  onStartEdit,
  onSave,
  onCancel,
  onWalkover,
  matchLog = [],
  locale,
  isEnglish,
  getStatusColor,
  getStatusLabel
}: AdminMatchCardProps) {
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)
  const showFinalScore = match.status === 'completed' && match.score1 !== undefined && match.score2 !== undefined
  const hasSubmittedScores =
    match.team1_submitted_score1 !== null && match.team1_submitted_score1 !== undefined ||
    match.team2_submitted_score1 !== null && match.team2_submitted_score1 !== undefined
  const submittedMismatch =
    match.team1_submitted_score1 !== null &&
    match.team1_submitted_score1 !== undefined &&
    match.team2_submitted_score1 !== null &&
    match.team2_submitted_score1 !== undefined &&
    (match.team1_submitted_score1 !== match.team2_submitted_score2 ||
      match.team1_submitted_score2 !== match.team2_submitted_score1)

  return (
    <div
      className={`rounded-lg border p-3 sm:p-4 transition-colors ${
        submittedMismatch
          ? 'border-orange-500/50 bg-orange-950/20'
          : match.status === 'live'
            ? 'border-red-500/40 bg-red-950/15'
            : 'border-slate-700/60 bg-slate-800/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 mt-1 shrink-0"
          aria-label={t('Velg kamp', 'Select match')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(match.status)}`}>
              {getStatusLabel(match.status, match)}
            </span>
            {metaLine && <span className="text-xs text-slate-400 truncate">{metaLine}</span>}
          </div>

          <p className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
            <span className="break-words">{match.team1_name}</span>
            <span className="text-slate-500 font-normal mx-2">vs</span>
            <span className="break-words">{match.team2_name}</span>
          </p>

          <div className="mt-2 text-2xl font-bold text-slate-50 tabular-nums">
            {showFinalScore ? `${match.score1} – ${match.score2}` : '– : –'}
          </div>

          {hasSubmittedScores && !isEditing && (
            <div className={`mt-2 text-xs ${submittedMismatch ? 'text-orange-300' : 'text-slate-400'}`}>
              {submittedMismatch && <span className="font-medium">{t('Uenighet: ', 'Conflict: ')}</span>}
              {match.team1_name}: {match.team1_submitted_score1 ?? '–'}-{match.team1_submitted_score2 ?? '–'}
              {' · '}
              {match.team2_name}: {match.team2_submitted_score1 ?? '–'}-{match.team2_submitted_score2 ?? '–'}
              <ProofLinks match={match} isEnglish={isEnglish} />
            </div>
          )}

          {isEditing ? (
            <div className="mt-4 space-y-3 border-t border-slate-700/60 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1 truncate" title={match.team1_name}>
                    {match.team1_name}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.score1 ?? ''}
                    onChange={e => setEditForm({ ...editForm, score1: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-2 bg-slate-700 rounded text-center"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1 truncate" title={match.team2_name}>
                    {match.team2_name}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.score2 ?? ''}
                    onChange={e => setEditForm({ ...editForm, score2: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-2 bg-slate-700 rounded text-center"
                  />
                </div>
              </div>
              {hasSubmittedScores && (
                <div className="flex flex-wrap gap-2">
                  {match.team1_submitted_score1 != null && match.team1_submitted_score2 != null && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          score1: match.team1_submitted_score1!,
                          score2: match.team1_submitted_score2!
                        })
                      }
                      className="text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                    >
                      {t('Bruk', 'Use')} {match.team1_name}
                    </button>
                  )}
                  {match.team2_submitted_score1 != null && match.team2_submitted_score2 != null && (
                    <button
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          score1: match.team2_submitted_score2!,
                          score2: match.team2_submitted_score1!
                        })
                      }
                      className="text-xs px-2 py-1 rounded bg-slate-600 hover:bg-slate-500"
                    >
                      {t('Bruk', 'Use')} {match.team2_name}
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="datetime-local"
                  lang={isEnglish ? 'en' : 'no'}
                  value={editForm.scheduled_time || ''}
                  onChange={e => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                  className="px-2 py-2 bg-slate-700 rounded text-sm w-full"
                />
                <select
                  value={editForm.status || 'scheduled'}
                  onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  className="px-2 py-2 bg-slate-700 rounded text-sm w-full"
                >
                  <option value="scheduled">{t('Planlagt', 'Scheduled')}</option>
                  <option value="live">LIVE</option>
                  <option value="pending_confirmation">{t('Venter bekreftelse', 'Pending confirmation')}</option>
                  <option value="pending_result">{t('Venter resultat', 'Pending result')}</option>
                  <option value="completed">{t('Ferdig', 'Finished')}</option>
                </select>
              </div>
              <ProofLinks match={match} isEnglish={isEnglish} />
              {matchLog.length > 0 && (
                <div className="text-xs text-slate-400 space-y-1">
                  <span className="font-medium text-slate-300">{t('Resultatlogg', 'Result log')}</span>
                  {matchLog.map((entry, i) => (
                    <div key={entry.id || i}>
                      {entry.action === 'admin_override'
                        ? t('Admin overstyring', 'Admin override')
                        : `${t('Bekreftet av', 'Confirmed by')} ${entry.actor_name || ''}`}
                      {' '}
                      ({entry.old_score1 ?? '-'}-{entry.old_score2 ?? '-'} → {entry.new_score1 ?? '-'}-
                      {entry.new_score2 ?? '-'}) {new Date(entry.created_at).toLocaleString(locale)}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={onSave} className="pro11-button text-sm flex items-center gap-1 px-4 py-2">
                  <Save className="w-4 h-4" />
                  {t('Lagre', 'Save')}
                </button>
                <button onClick={onCancel} className="pro11-button-secondary text-sm flex items-center gap-1 px-4 py-2">
                  <X className="w-4 h-4" />
                  {t('Avbryt', 'Cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={onStartEdit}
                className="pro11-button-secondary text-xs flex items-center gap-1 px-3 py-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                {t('Rediger', 'Edit')}
              </button>
              <button
                onClick={() => onWalkover('team1')}
                className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
              >
                WO {match.team1_name.length > 12 ? '1' : match.team1_name}
              </button>
              <button
                onClick={() => onWalkover('team2')}
                className="text-xs px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600"
              >
                WO {match.team2_name.length > 12 ? '2' : match.team2_name}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
