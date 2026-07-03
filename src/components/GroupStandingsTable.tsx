'use client'

import React from 'react'

export interface StandingsRow {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

interface GroupStandingsTableProps {
  rows: StandingsRow[]
  highlightTeam?: string
  qualifyCount?: number
  isEnglish?: boolean
  emptyMessage?: string
}

export default function GroupStandingsTable({
  rows,
  highlightTeam,
  qualifyCount = 2,
  isEnglish = false,
  emptyMessage
}: GroupStandingsTableProps) {
  const t = (noText: string, enText: string) => (isEnglish ? enText : noText)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        {emptyMessage ||
          t(
            'Tabellen oppdateres når gruppespillkamper er fullført.',
            'Standings update when group stage matches are completed.'
          )}
      </p>
    )
  }

  return (
    <div className="w-full overflow-x-auto overscroll-x-contain">
      <table className="vglive-standings w-full max-w-full table-fixed text-[11px] sm:text-sm border-collapse">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[34%] sm:w-[30%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[7%]" />
          <col className="w-[17%] sm:w-[15%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-slate-600 text-slate-400">
            <th className="py-2 sm:py-2.5 pl-1 sm:pl-2 pr-0.5 text-left font-medium">{t('Pl', '#')}</th>
            <th className="py-2 sm:py-2.5 px-1 sm:px-2 text-left font-medium">{t('Lag', 'Team')}</th>
            <th className="py-2 sm:py-2.5 px-0.5 text-center font-medium" title={t('Spilt', 'Played')}>
              {t('S', 'P')}
            </th>
            <th className="py-2 sm:py-2.5 px-0.5 text-center font-medium" title={t('Seier', 'Won')}>
              {t('V', 'W')}
            </th>
            <th className="py-2 sm:py-2.5 px-0.5 text-center font-medium" title={t('Uavgjort', 'Drawn')}>
              {t('U', 'D')}
            </th>
            <th className="py-2 sm:py-2.5 px-0.5 text-center font-medium" title={t('Tap', 'Lost')}>
              {t('T', 'L')}
            </th>
            <th className="py-2 sm:py-2.5 px-0.5 sm:px-2 text-center font-medium">{t('Mål', 'Goals')}</th>
            <th className="py-2 sm:py-2.5 pr-1 sm:pr-2 pl-0.5 text-center font-semibold">{t('P', 'Pts')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isOwnTeam = highlightTeam === row.team
            const inQualifyZone = index < qualifyCount
            return (
              <tr
                key={row.team}
                className={`standings-row border-b border-slate-700/70 ${
                  isOwnTeam
                    ? 'standings-row-own bg-blue-900/25'
                    : inQualifyZone
                      ? 'standings-row-qualify bg-emerald-950/20'
                      : 'hover:bg-slate-800/30'
                }`}
              >
                <td className="py-2 sm:py-2.5 pl-1 sm:pl-2 pr-0.5 text-slate-400 font-medium tabular-nums">{index + 1}</td>
                <td
                  className={`py-2 sm:py-2.5 px-1 sm:px-2 font-medium max-w-0 ${
                    isOwnTeam ? 'text-blue-300' : 'text-slate-100'
                  }`}
                  title={row.team}
                >
                  <span className="block truncate">{row.team}</span>
                </td>
                <td className="py-2 sm:py-2.5 px-0.5 text-center text-slate-200 tabular-nums">{row.played}</td>
                <td className="py-2 sm:py-2.5 px-0.5 text-center text-slate-200 tabular-nums">{row.wins}</td>
                <td className="py-2 sm:py-2.5 px-0.5 text-center text-slate-200 tabular-nums">{row.draws}</td>
                <td className="py-2 sm:py-2.5 px-0.5 text-center text-slate-200 tabular-nums">{row.losses}</td>
                <td className="py-2 sm:py-2.5 px-0.5 sm:px-2 text-center text-slate-200 tabular-nums whitespace-nowrap">
                  {row.goalsFor}-{row.goalsAgainst}
                </td>
                <td className="py-2 sm:py-2.5 pr-1 sm:pr-2 pl-0.5 text-center font-bold text-slate-50 tabular-nums">
                  {row.points}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="sm:hidden text-[10px] text-slate-500 mt-2">
        {t('Tabellen tilpasses skjermbredden. Trykk på lag for fullt navn.', 'Table fits screen width. Tap team for full name.')}
      </p>
    </div>
  )
}
