VIRTUAL GNSS LABORATORY — GNSS SIGNAL SIMULATION
ICD / SIS verification library

Verification basis
------------------
The PDFs in this folder were supplied by the user in GNSS ICD.zip and are bundled with this dashboard for offline academic verification. The dashboard does not silently fill missing ICD coverage.

Locally verified systems
------------------------
GPS
  IS-GPS-200N.pdf — L1 C/A, L2C, LNAV, CNAV
  IS-GPS-705J.pdf — L5
  IS-GPS-800J.pdf — L1C / CNAV-2
  ICD-GPS-240D.pdf — ancillary uploaded GPS interface document

Galileo
  Galileo_OS_SIS_ICD_v2.2.pdf — E1, E5a/E5b/E5, E5a-QP, E6 signal structure
  Galileo_HAS_SIS_ICD_v1.0.pdf — E6-B C/NAV High Accuracy Service

BeiDou
  BeiDou1.pdf — detailed B1I/B2I Open Service ICD v2.1
  Beidou2.pdf — Open Service Performance Standard covering high-level B1C/B2a/B2b/B1I/B3I characteristics
  NOTE: detailed modern B1C/B2a/B2b/B3I SIS ICDs are referenced by the performance standard but are not included in the uploaded archive. These dashboard entries are therefore marked PARTIAL.

GLONASS
  GLONASS.ICD.pdf — primary legacy L1/L2 FDMA ICD Edition 5.1
  ICD_GLONASS_4.0_(1998)_en.pdf — historical comparison
  GLONASS.pdf — supplementary presentation/review, not treated as the primary ICD

QZSS
  is-qzss-pnt-006.pdf — L1 C/A, L1C/B, L1C, L2C, L5
  is-qzss-l1s-009.pdf — L1S / SLAS
  is-qzss-l6-008.pdf — L6D/L6E / L62 / CSK

Not present in the uploaded archive
-----------------------------------
NavIC SIS ICDs
SBAS / WAAS SIS specification
These models remain visible as SUPPLEMENTARY and are not labelled locally verified.

Important corrections made during ICD verification
--------------------------------------------------
- GPS L1C data and pilot component carriers are represented as same-phase L1 components, not an I/Q quadrature pair.
- GPS L2C shows both CM (10,230 chips / 20 ms) and CL (767,250 chips / 1.5 s) generators.
- Galileo E5 data symbol rates are represented as 50 sps on E5a-I and 250 sps on E5b-I.
- Galileo E5a-QP is included from OS SIS ICD Issue 2.2.
- Galileo E6-B is shown as 1000 sps C/NAV; HAS payload rate up to 448 bps is tied to the HAS SIS ICD.
- BeiDou B1I/B2I code generation is tied to the two 11-stage polynomials in the uploaded detailed ICD.
- QZSS L1S is corrected to 250 bps source data -> 500 sps after rate-1/2 convolutional coding.
- QZSS L6 is shown with the L62 two-code 2.5575 Mcps streams, CSK and chip interleaving.

Academic use
------------
The dashboard is a teaching/simulation interface. Receiver-grade implementations must use the exact code tables, assignments, power ratios, phase conventions, timing rules and revision controls in the cited ICD/SIS document.
