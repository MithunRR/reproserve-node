// ============================================================
//  Canonical service-type taxonomy.
//  Kept in sync with the React register form (RegisterPage.jsx) and the
//  Find Providers / Realtors category filters. A provider's "service type"
//  is the granular subcategory; the broad category is derived from it on
//  the frontend.
// ============================================================

// Service provider specialties.
const SERVICE_PROVIDER_TYPES = [
  'General Contractor',
  'Roofer',
  'Flooring / Tile Installer',
  'Window / Door Contractor',
  'Siding Contractor',
  'Foundation / Structural Contractor',
  'Pool / Spa Contractor',
  'Handyman',
  'Electrician',
  'Plumber',
  'HVAC Technician',
  'Gutter / Drainage Specialist',
  'Septic / Wastewater Contractor',
  'Pest Control Technician',
  'Cleaning Service Provider',
  'Tree Service Contractor',
  'Landscaper / Hardscaper',
  'Painter',
  'Home Security Installer',
  'Locksmith',
  'Interior Designer / Stager'
];

// Realtor specialties.
const REALTOR_TYPES = [
  'Real Estate Agents & Brokers',
  'Mortgage Lenders / Loan Officers',
  'Inspectors',
  'Insurance & Warranty Agents',
  'Title Companies'
];

const ALL_SERVICE_TYPES = [...SERVICE_PROVIDER_TYPES, ...REALTOR_TYPES];

// Inserts any missing service_types rows. Idempotent — safe to run on every boot.
const seedServiceTypes = async (db) => {
  const { ServiceType } = db;
  let created = 0;
  for (const name of ALL_SERVICE_TYPES) {
    const [, wasCreated] = await ServiceType.findOrCreate({
      where: { name },
      defaults: { name, isActive: true }
    });
    if (wasCreated) created += 1;
  }
  console.log(`Service types seeded (${created} added, ${ALL_SERVICE_TYPES.length} expected).`);
};

// Resolves a raw value — a numeric id OR a name string — to a ServiceType id.
// A name that does not exist yet is created on the fly. Returns null for blanks
// or an unknown numeric id.
const resolveServiceTypeId = async (db, raw) => {
  if (raw === undefined || raw === null) return null;
  const { ServiceType } = db;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;

  // Numeric id.
  if (/^\d+$/.test(trimmed)) {
    const byId = await ServiceType.findByPk(Number(trimmed));
    return byId ? byId.id : null;
  }

  // Name string — find or create.
  const [record] = await ServiceType.findOrCreate({
    where: { name: trimmed },
    defaults: { name: trimmed, isActive: true }
  });
  return record.id;
};

module.exports = {
  SERVICE_PROVIDER_TYPES,
  REALTOR_TYPES,
  ALL_SERVICE_TYPES,
  seedServiceTypes,
  resolveServiceTypeId
};
