'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Check, Edit, Save, X } from 'lucide-react'
import { formatCaptainDiscordDisplay } from '@/lib/discord'

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

function getTeamDiscord(teamName: string, teamDiscordByName: Record<string, string>): string {
  if (teamDiscordByName[teamName]) return teamDiscordByName[teamName]
  const key = Object.keys(teamDiscordByName).find(
    name => name.toLowerCase() === teamName.toLowerCase()
  )
  return key ? teamDiscordByName[key] : ''
}

function TeamNameWithDiscord({
  teamName,
  teamDiscordByName,
  align = 'left',
  isEnglish
}: {
  teamName: string
  teamDiscordByName: Record<string, string>
  align?: 'left' | 'right'
  isEnglish: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)
  const discord = getTeamDiscord(teamName, teamDiscordByName)

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return

    const updatePosition = () => {
      const trigger = buttonRef.current
      if (!trigger) return

      const rect = trigger.getBoundingClientRect()
      const popupHeight = popupRef.current?.offsetHeight ?? 72
      const popupWidth = popupRef.current?.offsetWidth ?? 176
      const gap = 6
      const spaceBelow = window.innerHeight - rect.bottom
      const openAbove = spaceBelow < popupHeight + gap + 8

      let top = openAbove ? rect.top - popupHeight - gap : rect.bottom + gap
      let left = align === 'right' ? rect.right - popupWidth : rect.left

      left = Math.max(8, Math.min(left, window.innerWidth - popupWidth - 8))
      top = Math.max(8, Math.min(top, window.innerHeight - popupHeight - 8))

      setPopupStyle({ top, left, width: Math.max(rect.width, 176) })
    }

    updatePosition()
    const frame = requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open, align])

  useEffect(() => {
    if (!open) setPopupStyle({})
  }, [open])

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!discord) return
    await navigator.clipboard.writeText(discord)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={e => {
          e.stopPropagation()
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const estimatedHeight = 72
            const width = Math.max(rect.width, 176)
            const gap = 6
            const openAbove = window.innerHeight - rect.bottom < estimatedHeight + gap + 8
            let top = openAbove ? rect.top - estimatedHeight - gap : rect.bottom + gap
            let left = align === 'right' ? rect.right - width : rect.left
            left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
            top = Math.max(8, Math.min(top, window.innerHeight - estimatedHeight - 8))
            setPopupStyle({ top, left, width })
          }
          setOpen(prev => !prev)
        }}
        className={`truncate font-medium w-full hover:text-[#949cf0] hover:underline cursor-pointer ${
          align === 'right' ? 'text-right' : 'text-left'
        }`}
        title={t(`Klikk for Discord (${teamName})`, `Click for Discord (${teamName})`)}
      >
        {teamName}
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[100] cursor-default bg-transparent"
              aria-label={t('Lukk', 'Close')}
              onClick={() => setOpen(false)}
            />
            <div
              ref={popupRef}
              style={popupStyle}
              className="fixed z-[101] p-2.5 rounded-lg border border-[#5865F2]/40 bg-slate-900 shadow-xl max-w-[16rem]"
            >
              <p className="text-[10px] text-slate-400 mb-1 truncate" title={teamName}>
                {teamName}
              </p>
              {discord ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-[#949cf0] truncate">
                    {formatCaptainDiscordDisplay(discord, isEnglish)}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 p-1 rounded hover:bg-[#5865F2]/25 text-[#949cf0]"
                    title={t('Kopier', 'Copy')}
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {formatCaptainDiscordDisplay(null, isEnglish)}
                </p>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  )
}

interface AdminMatchCardProps {
  match: AdminMatchCardMatch
  metaLine?: string | null
  teamDiscordByName?: Record<string, string>
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

function ProofLinks({ match }: { match: AdminMatchCardMatch }) {
  if (!match.team1_proof_url && !match.team2_proof_url) return null
  return (
    <>
      {match.team1_proof_url && (
        <a
          href={match.team1_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          📷1
        </a>
      )}
      {match.team2_proof_url && (
        <a
          href={match.team2_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          📷2
        </a>
      )}
    </>
  )
}

export default function AdminMatchCard({
  match,
  metaLine,
  teamDiscordByName = {},
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
    (match.team1_submitted_score1 !== null && match.team1_submitted_score1 !== undefined) ||
    (match.team2_submitted_score1 !== null && match.team2_submitted_score1 !== undefined)
  const submittedMismatch =
    match.team1_submitted_score1 !== null &&
    match.team1_submitted_score1 !== undefined &&
    match.team2_submitted_score1 !== null &&
    match.team2_submitted_score1 !== undefined &&
    (match.team1_submitted_score1 !== match.team2_submitted_score2 ||
      match.team1_submitted_score2 !== match.team2_submitted_score1)
  const showSubmissionLine =
    hasSubmittedScores &&
    !isEditing &&
    (submittedMismatch || match.status === 'pending_confirmation' || match.status === 'pending_result')

  const score1 = showFinalScore ? match.score1 : null
  const score2 = showFinalScore ? match.score2 : null

  return (
    <div
      className={
        submittedMismatch
          ? 'bg-orange-950/25'
          : match.status === 'live'
            ? 'bg-red-950/10'
            : undefined
      }
    >
      {isEditing ? (
        <div className="px-2 py-2 space-y-2 border-b border-slate-700/50 bg-slate-800/60">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <input type="checkbox" checked={selected} onChange={onToggleSelect} className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium truncate">{match.team1_name}</span>
            <span className="text-slate-500">vs</span>
            <span className="font-medium truncate">{match.team2_name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              value={editForm.score1 ?? ''}
              onChange={e => setEditForm({ ...editForm, score1: parseInt(e.target.value) || 0 })}
              className="px-2 py-1 bg-slate-700 rounded text-center text-sm"
              placeholder={match.team1_name}
            />
            <input
              type="number"
              min="0"
              value={editForm.score2 ?? ''}
              onChange={e => setEditForm({ ...editForm, score2: parseInt(e.target.value) || 0 })}
              className="px-2 py-1 bg-slate-700 rounded text-center text-sm"
              placeholder={match.team2_name}
            />
          </div>
          {hasSubmittedScores && (
            <div className="flex flex-wrap gap-1">
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
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600 hover:bg-slate-500"
                >
                  {t('Bruk', 'Use')} 1
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
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600 hover:bg-slate-500"
                >
                  {t('Bruk', 'Use')} 2
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="datetime-local"
              lang={isEnglish ? 'en' : 'no'}
              value={editForm.scheduled_time || ''}
              onChange={e => setEditForm({ ...editForm, scheduled_time: e.target.value })}
              className="px-2 py-1 bg-slate-700 rounded text-xs w-full"
            />
            <select
              value={editForm.status || 'scheduled'}
              onChange={e => setEditForm({ ...editForm, status: e.target.value })}
              className="px-2 py-1 bg-slate-700 rounded text-xs w-full"
            >
              <option value="scheduled">{t('Planlagt', 'Scheduled')}</option>
              <option value="live">LIVE</option>
              <option value="pending_confirmation">{t('Venter bekreftelse', 'Pending')}</option>
              <option value="pending_result">{t('Venter resultat', 'Awaiting')}</option>
              <option value="completed">{t('Ferdig', 'Finished')}</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <ProofLinks match={match} />
          </div>
          {matchLog.length > 0 && (
            <div className="text-[10px] text-slate-400 space-y-0.5 max-h-20 overflow-y-auto">
              {matchLog.map((entry, i) => (
                <div key={entry.id || i}>
                  {entry.action === 'admin_override'
                    ? t('Admin', 'Admin')
                    : entry.actor_name || t('Bekreftet', 'Confirmed')}
                  {' '}
                  ({entry.old_score1 ?? '-'}-{entry.old_score2 ?? '-'} → {entry.new_score1 ?? '-'}
                  {entry.new_score2 ?? '-'})
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-1">
            <button onClick={onSave} className="pro11-button text-xs flex items-center gap-1 px-2 py-1">
              <Save className="w-3 h-3" />
              {t('Lagre', 'Save')}
            </button>
            <button onClick={onCancel} className="pro11-button-secondary text-xs flex items-center gap-1 px-2 py-1">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 text-xs sm:text-sm min-h-[2rem]">
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="h-3.5 w-3.5 shrink-0"
              aria-label={t('Velg', 'Select')}
            />
            <span className="w-[28%] sm:w-[22%] min-w-0">
              <TeamNameWithDiscord
                teamName={match.team1_name}
                teamDiscordByName={teamDiscordByName}
                align="right"
                isEnglish={isEnglish}
              />
            </span>
            <span className="w-5 text-center font-bold tabular-nums text-slate-200">{score1 ?? '·'}</span>
            <span className="text-slate-600">-</span>
            <span className="w-5 text-center font-bold tabular-nums text-slate-200">{score2 ?? '·'}</span>
            <span className="w-[28%] sm:w-[22%] min-w-0">
              <TeamNameWithDiscord
                teamName={match.team2_name}
                teamDiscordByName={teamDiscordByName}
                isEnglish={isEnglish}
              />
            </span>
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${getStatusColor(match.status)}`}
            >
              {getStatusLabel(match.status, match)}
            </span>
            {metaLine && (
              <span className="hidden lg:inline text-[10px] text-slate-500 truncate max-w-[7rem]" title={metaLine}>
                {metaLine}
              </span>
            )}
            <div className="ml-auto flex shrink-0 gap-0.5">
              <button
                onClick={onStartEdit}
                className="p-1 rounded hover:bg-slate-700 text-blue-400"
                title={t('Rediger', 'Edit')}
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onWalkover('team1')}
                className="px-1 py-0.5 rounded text-[10px] bg-slate-700/80 hover:bg-slate-600"
                title={`WO ${match.team1_name}`}
              >
                WO1
              </button>
              <button
                onClick={() => onWalkover('team2')}
                className="px-1 py-0.5 rounded text-[10px] bg-slate-700/80 hover:bg-slate-600"
                title={`WO ${match.team2_name}`}
              >
                WO2
              </button>
            </div>
          </div>
          {showSubmissionLine && (
            <div
              className={`px-2 pb-1 pl-7 text-[10px] leading-tight truncate ${
                submittedMismatch ? 'text-orange-300' : 'text-slate-500'
              }`}
            >
              {submittedMismatch && '⚠ '}
              {match.team1_submitted_score1 ?? '·'}-{match.team1_submitted_score2 ?? '·'} /{' '}
              {match.team2_submitted_score1 ?? '·'}-{match.team2_submitted_score2 ?? '·'}
              {(match.team1_proof_url || match.team2_proof_url) && (
                <span className="ml-1">
                  <ProofLinks match={match} />
                </span>
              )}
            </div>
          )}
          {metaLine && (
            <div className="px-2 pb-1 pl-7 text-[10px] text-slate-500 lg:hidden truncate">{metaLine}</div>
          )}
        </>
      )}
    </div>
  )
}
