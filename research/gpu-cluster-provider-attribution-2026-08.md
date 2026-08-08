# Who actually owns the clusters behind the DAITS LinkedIn offer?

**Research date:** 2026-08-08 · **Trigger:** LinkedIn post by Ashley Bowdler (CEO, DAITS) advertising, with RFS dates within 8 weeks: 500 B300 nodes (US), 256 B300 nodes (EU), 128 B200 nodes (US), 20 H100 nodes (UAE), 80+ RTX 6000 PRO nodes (EU), plus bare-metal H200 SXM on 12–24-month terms up to 320 nodes.

**Method:** Four parallel deep-research sweeps (broker identity; B300 US/EU; B200 + H200; H100 UAE + RTX 6000 PRO EU) across public filings, press, provider pages, marketplace listings, and Companies House. No public evidence directly ties DAITS to any provider — every attribution below is supply-side triangulation from fleet timing, geography, chassis specs, and each operator's wholesale behavior. Confidence is flagged per block.

---

## TL;DR

**DAITS owns nothing.** DAITS AI LTD is a UK micro-company incorporated **11 September 2025** (Companies House no. 16710848, virtual office in Westbury-on-Trym, Bristol), part of a small Suffolk-run brand cluster (daits.org "AI trust certification" + planned $DAITS token, GPURental.group, PUNCH AI, AIToolsfied). Ashley Bowdler's documented background is generalist B2B sales consultancy in Ipswich (MD of FORCE Business Development Ltd) — no data-center, neocloud, or hardware pedigree. Their own copy says they "work with GPU cloud providers and infrastructure partners to help source and plan GPU resources": a pure introducer/re-broker.

The advertised sheet is almost certainly **multi-listed wholesale inventory** circulating through the broker market. The identical **256-node / 2,048-GPU B300 EU block** was observed listed anonymously on GPUaaS.com (hosted·ai's marketplace) and other broker pages in Aug 2026 at ~$3.65/GPU/hr on 2-year reserve — DAITS is very likely re-marketing the same off-market inventory, possibly two hops from the metal.

**Most probable underlying owners, per block:**

| Advertised block | #1 candidate | #2 | #3 | Confidence |
|---|---|---|---|---|
| 500× B300 nodes, US | **IREN** (Childress, TX) | Voltage Park / Lightning AI | QumulusAI (+ partners) | Medium |
| 256× B300 nodes, EU | **Verda** (ex-DataCrunch; Finland/Iceland) | Polarise (Oslo) | Fluidstack @ Borealis (Iceland) | Medium |
| 128× B200 nodes, US | **Voltage Park / Lightning AI** | Lambda (Columbus, OH) | GMI Cloud | Low-Medium |
| ≤320× H200 SXM nodes, 12–24 mo | **NexGen Cloud / Hyperstack** (Oslo/Quebec) | Fluidstack @ Borealis re-let | GMI Cloud; Rumble/Northern Data | Medium |
| 20× H100 nodes, UAE | **Hyperfusion** (Dubai) | Core42 / G42 | (unnamed Edgevana-listed UAE host) | Medium-High |
| 80+× RTX 6000 PRO nodes, EU | **NexGen Cloud / Hyperstack** | HOSTKEY (Amsterdam) | Verda; Hetzner | Medium |

**The tidiest single explanation:** one UK-to-UK wholesale relationship with **NexGen Cloud (Hyperstack / AI Supercloud)** — which independently surfaced as a top candidate in *three* of the six blocks (H200 SXM, RTX 6000 PRO EU, and dark-horse for B200 US via Hyperstack US-1 Texas), and whose marketing uses the exact "in as little as 8 weeks" delivery language the DAITS post echoes — plus one UAE relationship (Hyperfusion or Core42 channel) and re-brokered marketplace inventory for the B300 blocks.

---

## 1. The broker: DAITS / Ashley Bowdler

- **DAITS AI LTD**, no. 16710848, incorporated 11 Sep 2025; registered at a virtual office (The Bristol Office, 5 High St, Westbury-on-Trym, Bristol); SIC "Other information technology service activities"; sole director born March 1982. ([Companies House](https://find-and-update.company-information.service.gov.uk/company/16710848))
- Brand: **D**ecentralized **AI** **T**rust & **S**ecurity ([daits.org](https://www.daits.org/)) — on-chain AI certification with a planned **$DAITS token** ([@DAITSorg](https://x.com/DAITSorg)); compute arm **[GPURental.group](https://www.gpurental.group/)** ("globally distributed, decentralised network… infrastructure certified by DAITS"); sister brands PUNCH AI (consultancy) and AIToolsfied (tools directory).
- **Ashley Paul Bowdler** (Ipswich): MD of FORCE Business Development Ltd (inc. 2023), fractional sales/BD consultant; 2025 pivot to web3/AI content. No prior GPU/DC industry roles found. "CEO of DAITS" is strongly implied but not independently confirmed from public records (Companies House officer name not retrievable in snippets). Known staff: a VP of Sales in Stowmarket, ex-AIToolsfied, no GPU industry background.
- **No evidence of owned facilities, GPUs, funding, or named supply partners anywhere.** Their inventory list (B300/B200/H200/H100/RTX PRO 6000, US/EU/UAE, 8-week RFS, 12–24-mo terms) mirrors what wholesale marketplaces such as **[GPUaaS.com](https://gpuaas.com/cluster)** (hosted·ai, "20+ vetted providers") list SKU-for-SKU. Direct DAITS↔GPUaaS link: none found; flagged as plausible speculation only.

**Implication:** the question "who is the underlying provider" has a different answer per line item, and DAITS may itself not be the first broker in the chain.

---

## 2. Block-by-block attribution

### 2a. 500× B300 nodes, US (≈4,000 GPUs, ~7 MW IT), RFS ≈ Sept–Oct 2026

Context: B300 remains allocation-constrained through Q3 2026 (~30-week lead times for non-priority buyers), so an 8-week-RFS block means **hardware already allocated and racking now** — a new-landing tranche, not idle stock.

1. **IREN (Childress, TX + Mackenzie, BC) — most plausible.** Confirmed purchase agreements for **50,000+ B300s** (fleet to 150k GPUs, announced 4 Mar 2026), deployed **in phases through H2 2026** in existing air-cooled halls ([IREN PR](https://iren.com/resources/news/iren-expands-ai-cloud-capacity-to-150000-gpus)). Confirmed wholesale-block seller (Fluidstack, Together AI, Fireworks, Fal, Perplexity, Microsoft…), with **~15% of its $4bn+ ARR target still uncontracted** as of 20 Jul 2026 — i.e., actively shopping multi-thousand-GPU B300 blocks right now ([$2.8bn contracts PR](https://www.globenewswire.com/news-release/2026/07/20/3329624/0/en/)). A 4,000-GPU block ≈ one tranche of the 50k rollout. Caveat: Mackenzie is Canada; brokers often blur "US/North America."
2. **Voltage Park / Lightning AI** — sells B200/B300/GB300 **only via long-term contract** across 7 US Tier-3+ DCs (TX, WA, VA, UT; 35k+ GPUs post-merger), historically distributes through marketplaces (TensorDock, Shadeform) ([voltagepark.com/blackwells](https://www.voltagepark.com/blackwells)).
3. **QumulusAI (Atlanta)** — confirmed **1,632 B300s / 204 HGX systems** landing summer–fall 2026, and confirmed selling through brokers via **$18M and $32M two-year take-or-pay deals with "marketplace partners"** — the exact DAITS supply pattern — but only ~40% of the block alone ([Businesswire](https://www.businesswire.com/news/home/20260720975123/en/)). Plausible as part of an aggregated 500.
- Ruled out: CoreWeave (direct-only, broadly sold out), Nebius (sold out; its UK Ark Longcross site is literally a 500-node/4,000-B300 pod — showing 500×8 is a standard pod quantum — but UK ≠ US and presold), Crusoe (Abilene committed), Lambda (GB300-supercluster strategy, direct), TensorWave (AMD-only), Applied Digital/Cipher/TeraWulf/Core Scientific (landlords, own no GPUs).

### 2b. 256× B300 nodes, EU (2,048 GPUs — the natural max of a two-tier Spectrum-X800 pod)

**Smoking-gun-adjacent:** an anonymous **256-node / 2,048-GPU B300 EU block at ~$3.65/GPU/hr on 2-year reserve, RFS Aug–Oct 2026** was observed multi-listed across broker pages in Aug 2026 (incl. [GPUaaS.com/clusters-b300](https://gpuaas.com/clusters-b300): 60+ nodes Sept RFS + 120+ nodes late-Oct RFS, **4U liquid-cooled chassis with BlueField-3**). That chassis spec matches **Supermicro's 4U DLC HGX B300** platform, narrowing the owner to a Supermicro-channel NVIDIA partner in the EU/EEA.

1. **Verda (ex-DataCrunch; Helsinki ×2 + Reykjanesbær) — most plausible.** The publicly identifiable European operator of **Supermicro liquid-cooled GB300/B300/B200** racks ([verda.com/b300](https://verda.com/b300)); NVIDIA Preferred Partner, $64M Series A, sells dedicated/private-cloud blocks.
2. **Polarise (AI Hub ONE, Oslo Gardermoen, 16 MW)** — "HGX B300 now available in Oslo, sovereign in Europe," explicitly **bare-metal wholesale**, NVIDIA Cloud Service Provider ([polarise.eu/b300](https://polarise.eu/b300/)). A 256-node (~4 MW) pod fits comfortably.
3. **Fluidstack @ Borealis (Iceland)** — aggregator with exascale Dell/NVIDIA Nordic buildouts; broker-to-broker resale plausible.
- Lower: Nscale Glomfjord (mostly Microsoft-committed; UK HQ makes a UK-broker tie natural though), Scaleway (direct/telco GTM), Gcore, Sesterce (itself a reseller — possible *intermediate* hop, not owner).

### 2c. 128× B200 nodes, US (≈1,024 GPUs)

1. **Voltage Park / Lightning AI** — B200 long-term blocks through channel/marketplace sales (see above).
2. **Lambda** — confirmed HGX B200 halls at Cologix COL4 Columbus, OH, with US megawatt footprint quadrupling into 2026 and a 16–2,000+ GPU "1-Click Cluster" product a 1,024-GPU block fits squarely ([Cologix PR](https://cologix.com/news/cologix-and-lambda-launch-first-nvidia-hgx-b200-accelerated-ai-clusters-in-columbus-at-col4/)); caveat: mostly own-brand sales.
3. **GMI Cloud (Silicon Valley + Colorado)** — B200 bare metal from $4.00/GPU-hr and a **formal partner program explicitly allowing capacity resale** ([gmicloud.ai partnership](https://www.gmicloud.ai/en/company/partnership)) — the cleanest white-label match if the DAITS block is fully brokered.
- Dark horse: **NexGen Cloud, Hyperstack US-1 (Texas)** — see 2d. Also possible: Vultr (channel-friendly, B200 bare metal), ionstream Houston ($3.50/GPU-hr B200, scale unproven). IREN's B200s sit in Canada; WhiteFiber's in Iceland.

### 2d. Bare-metal H200 SXM, 12–24-month terms, up to 320 nodes (≈2,560 GPUs)

Context: H200 is being repriced as Blackwell ramps (reserved ≈ $2.10–2.60/GPU/hr by Aug 2026) — this block is displaced-Hopper inventory being pushed on medium terms.

1. **NexGen Cloud / Hyperstack "AI Supercloud" (AQ Compute AQ-OSL1 Oslo, 50 MW + Quebec + Texas) — most plausible.** Advertises reservation of "thousands of NVIDIA HGX H200s" with delivery "**in as little as 8 weeks**" on reserved contracts — matching the DAITS ad parameter-for-parameter, phrase-for-phrase ([nexgencloud.com/nvidia-hgx-h200](https://www.nexgencloud.com/nvidia-hgx-h200)). UK company, NVIDIA Elite Partner, channel-led GTM — the natural counterparty for a UK broker. As Hyperstack pushes B300/GB300, its H200 estate is the obvious discounted-wholesale inventory.
2. **Fluidstack @ Borealis (Iceland)** — 2025-vintage Dell XE9680 H200 exascale clusters whose 12–24-month AI-lab contracts (Mistral, Poolside, Character.AI…) roll off precisely mid-to-late 2026; a 2,560-GPU re-let block is exactly that shape.
3. **GMI Cloud** — most aggressive owner-operator H200 pricing ($2.60 bare metal, no minimum) + formal resale program.
4. **Rumble / Northern Data (Taiga)** — post-acquisition (17 Jun 2026) holds ~2,000 H200 + 20,400 H100 across nine EU/US DCs with 200 MW+ un-monetized and an explicit monetization mandate — textbook broker-channel supply, though pure-H200 count runs slightly under 320 nodes.

### 2e. 20× H100 nodes, UAE (≈160 GPUs)

1. **Hyperfusion (Dubai) — best fit.** Its published architecture is **"high-density pods of 160 GPUs"** on ASUS ESC N8 8×H100 servers with Quantum-2 InfiniBand — i.e., *exactly* 20 nodes × 8 = 160, a literal quantum match to the DAITS line ([hyperfusion.io](https://hyperfusion.io/)). Confirmed reseller-channel GTM (Alpha Data and RendeRex partnerships). Physical site undisclosed — a Dubai Tier 3 colo (Khazna/Moro Hub/Equinix DX candidates).
2. **Core42 (G42)** — the UAE's largest commercial H100 base (10,000-H100 facility, DGX SuperPOD + Dell XE9680) and a **proven wholesaler** (supplies e& UAE's "GPU Connect" sovereign capacity). Counterpoint: Core42 deals skew large/branded; a 20-node block via an unknown Bristol broker fits a smaller neocloud better.
3. There is at least one unnamed UAE host wholesaling 8×H100 nodes through marketplaces (~$17k/node/mo listing on [Edgevana](https://nodes.edgevana.com/gpu-servers/h100/uae)) — possibly Hyperfusion itself.
- **Timing tell:** BIS **eased UAE export controls on 10 July 2026** (license-exception access for approved entities incl. G42) ([bis.gov](https://www.bis.gov/press-release/department-commerce-eases-export-controls-uae)), three weeks before this ad. An "RFS in 8 weeks" UAE H100 offer in early August is consistent with fresh in-country supply or re-marketed existing stock under the new regime.

### 2f. 80+× RTX 6000 PRO nodes, EU

1. **NexGen Cloud / Hyperstack — best fit.** Added RTX PRO 6000 Server Edition Aug 2025, runs an explicit **reservation product** ($1.26/hr reserved vs $1.85 on-demand), EU/EEA regions (Norway), partner-channel GTM ([hyperstack.cloud/rtx-pro-6000-se-reserve-now](https://www.hyperstack.cloud/rtx-pro-6000-se-reserve-now)). Same UK-to-UK chain as the H200 block.
2. **HOSTKEY (Amsterdam)** — actively expanding an RTX 6000 PRO Blackwell dedicated-server fleet (€1,600/mo or €2.22/hr), bulk build-to-order, reseller-friendly ([hostkey.com](https://hostkey.com/gpu-dedicated-servers/rtx-6000-pro/)).
3. **Verda** — RTX PRO 6000 live on owned Finnish/Icelandic Blackwell racks.
4. **Hetzner (GEX131, €889/mo, Max-Q variant)** — largest and cheapest EU fleet, commonly arbitraged by resellers, though self-serve retail leaves brokers little to add.
- Also live in EU: Seeweb (IT), Leafcloud (NL), vshosting (CZ), IONOS, Exoscale, Sesterce. Not yet/no fleet: OVHcloud (roadmap only), Scaleway, Gcore.

---

## 3. Cross-cutting read

1. **No public DAITS↔provider link exists.** Everything above is triangulation; confidence tiers reflect quantum matches (Hyperfusion's 160-GPU pods; the multi-listed 256-node B300 EU block), timing matches (IREN's H2-2026 B300 tranches; the July 2026 UAE export easing), and language matches (NexGen's "as little as 8 weeks").
2. **NexGen Cloud is the recurring thread** — top-ranked or dark horse in three of six blocks. A single Hyperstack wholesale relationship plus one UAE source would explain most of the DAITS sheet.
3. **Broker-chain stacking is endemic.** The same anonymous blocks appear on GPUaaS.com (hosted·ai), Edgevana, Spheron, Sesterce, Shadeform, Hydra Host, Vast.ai. DAITS may be two or more hops from the metal, which matters for price, SLA enforceability, and whether the capacity is even exclusive.
4. **Sell-side behavior sorts the market cleanly:** confirmed white-label wholesalers (GMI Cloud, QumulusAI, IREN, Voltage Park, Polarise, Hyperfusion, WhiteFiber, HOSTKEY) vs. direct-only/sold-out (CoreWeave, Nebius, Crusoe, Scaleway, Lambda-mostly). Any brokered block almost certainly traces to the first group.
5. **Practical diligence if engaging DAITS (or any broker on these blocks):** ask for (a) the named upstream operator and facility/colo address, (b) whether the counterparty to the MSA is the asset owner or another intermediary, (c) proof of allocation (serials/PO or NVIDIA NCP letter) for the B300 blocks given Q3 constraints, and (d) for the UAE block, the export-license basis (post-10-Jul-2026 BIS exception vs. existing stock).

---

## Appendix: confidence legend & caveats

- **Confirmed** = stated in a filing, press release, or the provider's own page (linked inline). **Inferred** = triangulated; no direct attribution exists.
- LinkedIn, Companies House pages, and several provider sites were egress-blocked during research; some details rest on search-index snippets rather than full page reads.
- Node counts for most EU RTX PRO 6000 and several B200/H200 fleets are not public, so "80+"/"128"/"320" cannot be positively matched to a single published figure anywhere.
- All four research sweeps were run 8 August 2026; this market reprices weekly.
