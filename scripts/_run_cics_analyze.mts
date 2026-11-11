import { analyzeTranscript } from "../src/lib/analyze-transcript.ts"
import { readFileSync, writeFileSync } from "fs"
const transcriptPath = "./public/interviews/c8d0df2a-541e-4b01-968f-ae46072198c7/transcript.txt"
const analysisPath = "./public/interviews/c8d0df2a-541e-4b01-968f-ae46072198c7/analysis.json"
const t = readFileSync(transcriptPath, "utf8").trim()
const c = analyzeTranscript(t)
const counts = { heuristic: 0, procedure: 0, gotcha: 0, term: 0 }
for (const x of c) counts[x.kind]++
console.log("TOTAL", c.length)
console.log("COUNTS", JSON.stringify(counts))
for (const x of c) console.log(x.kind.toUpperCase() + ": " + x.title)
const prev = JSON.parse(readFileSync(analysisPath, "utf8"))
writeFileSync(analysisPath, JSON.stringify({ ...prev, title: "CICS interview", transcript: t, candidates: c, reanalyzedAt: new Date().toISOString() }, null, 2))
