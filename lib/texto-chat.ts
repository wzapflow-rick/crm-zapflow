export function limparFormatacaoChat(texto: string): string {
  return texto
    .replace(/```[a-zA-Z0-9_-]*\n?/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\((?:[^()]|\([^()]*\))*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-+*]\s+/gm, "")
    .replace(/[﻿#*]/g, "")
    .replace(/~~/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
