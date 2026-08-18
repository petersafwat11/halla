# Halaa DPO requirement assessment

**Status:** `ENGINEERING_FACTS_COMPLETE_QUALIFIED_DETERMINATION_PENDING`

## Relevant facts

- Halaa is a private organization serving the public.
- Core service processing includes accounts, events, guests, messaging, purchases and UGC.
- Vendor onboarding may process official identity documents.
- Dietary fields may constitute sensitive/health-related personal data depending on use and legal characterization.
- The system performs security, fraud and operational monitoring, but the repository does not establish whether this is “regular and systematic monitoring” at the legally relevant scale.
- Current user volume, data-subject count and sensitive-data scale are not evidenced in the repository.

## Criteria requiring qualified review

Saudi PDPL implementing rules identify circumstances including large-scale public-sector processing, core activities involving regular/systematic monitoring, and core activities involving sensitive personal data. The repository can establish the types of processing but cannot determine legal scale or make the final statutory classification.

## Engineering recommendation

Designate a named privacy owner immediately even if counsel concludes a formal DPO is not mandatory. That person should own rights requests, incidents, processor register, DPIA updates, retention evidence and regulator/user communications. Obtain a written qualified determination addressing:

1. whether vendor verification and dietary data are core sensitive processing;
2. the scale and frequency of processing;
3. whether platform safety/fraud monitoring is regular and systematic;
4. whether an internal or external DPO is appropriate;
5. required registration/contact publication, if any.

Result: `DPO_REQUIRED`, `DPO_NOT_REQUIRED_WITH_RATIONALE`, or `REASSESS_AT_SCALE_THRESHOLD`. Do not infer the result from the app’s store age rating.
