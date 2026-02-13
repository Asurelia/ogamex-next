export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-ogame-bg text-ogame-text p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-ogame-accent mb-8">OGameX API Documentation</h1>

        <div className="space-y-8">
          {/* Introduction */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Introduction</div>
            <div className="ogame-panel-content prose prose-invert">
              <p className="text-ogame-text-muted">
                The OGameX API allows AI agents and external applications to interact with the game.
                All endpoints require authentication using a Bearer token.
              </p>
              <p className="text-ogame-text-muted mt-4">
                Base URL: <code className="text-ogame-accent">/api/v1</code>
              </p>
            </div>
          </section>

          {/* Authentication */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Authentication</div>
            <div className="ogame-panel-content">
              <h3 className="text-ogame-text-header font-semibold mb-2">POST /api/v1/auth</h3>
              <p className="text-ogame-text-muted mb-4">
                Authenticate and receive an API token.
              </p>
              <div className="bg-[#0a0f14] p-4 rounded-sm mb-4">
                <pre className="text-sm overflow-x-auto">
{`// Request
POST /api/v1/auth
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "your-password"
}

// Response
{
  "token": "uuid-token-here",
  "expires_at": "2024-02-13T00:00:00Z",
  "user": {
    "id": "user-id",
    "username": "PlayerName"
  }
}`}
                </pre>
              </div>
              <p className="text-ogame-text-muted text-sm">
                Use the token in subsequent requests:
              </p>
              <div className="bg-[#0a0f14] p-4 rounded-sm mt-2">
                <code className="text-ogame-accent">Authorization: Bearer your-token-here</code>
              </div>
            </div>
          </section>

          {/* Player */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Player</div>
            <div className="ogame-panel-content">
              <h3 className="text-ogame-text-header font-semibold mb-2">GET /api/v1/player</h3>
              <p className="text-ogame-text-muted mb-4">
                Get current player information including research levels and planets.
              </p>
              <div className="bg-[#0a0f14] p-4 rounded-sm">
                <pre className="text-sm overflow-x-auto">
{`// Response
{
  "player": {
    "id": "uuid",
    "username": "PlayerName",
    "dark_matter": 10000,
    "character_class": "collector"
  },
  "research": {
    "energy_technology": 5,
    "weapons_technology": 3,
    ...
  },
  "planets": [
    { "id": "uuid", "name": "Homeworld", "galaxy": 1, "system": 100, "position": 7 }
  ],
  "highscore": {
    "total_points": 1000,
    "rank": 42
  }
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* Planets */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Planets</div>
            <div className="ogame-panel-content space-y-6">
              <div>
                <h3 className="text-ogame-text-header font-semibold mb-2">GET /api/v1/planets</h3>
                <p className="text-ogame-text-muted">
                  Get all planets with full details (resources, buildings, ships, defense).
                </p>
              </div>

              <div>
                <h3 className="text-ogame-text-header font-semibold mb-2">GET /api/v1/planets/:planetId</h3>
                <p className="text-ogame-text-muted">
                  Get specific planet details including active build queues.
                </p>
              </div>

              <div>
                <h3 className="text-ogame-text-header font-semibold mb-2">POST /api/v1/planets/:planetId/build</h3>
                <p className="text-ogame-text-muted mb-4">
                  Start building construction on a planet.
                </p>
                <div className="bg-[#0a0f14] p-4 rounded-sm">
                  <pre className="text-sm overflow-x-auto">
{`// Request
POST /api/v1/planets/{planetId}/build
Content-Type: application/json

{
  "building_id": 1  // 1 = Metal Mine
}

// Response
{
  "success": true,
  "message": "Started building Metal Mine to level 5",
  "queue_item": {
    "id": "uuid",
    "building": "Metal Mine",
    "target_level": 5,
    "ends_at": "2024-01-13T12:30:00Z",
    "duration_seconds": 3600
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* Fleet */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Fleet</div>
            <div className="ogame-panel-content space-y-6">
              <div>
                <h3 className="text-ogame-text-header font-semibold mb-2">GET /api/v1/fleet</h3>
                <p className="text-ogame-text-muted">
                  Get all active fleet missions.
                </p>
              </div>

              <div>
                <h3 className="text-ogame-text-header font-semibold mb-2">POST /api/v1/fleet</h3>
                <p className="text-ogame-text-muted mb-4">
                  Send a fleet on a mission.
                </p>
                <div className="bg-[#0a0f14] p-4 rounded-sm">
                  <pre className="text-sm overflow-x-auto">
{`// Request
POST /api/v1/fleet
Content-Type: application/json

{
  "origin_planet_id": "uuid",
  "destination": {
    "galaxy": 1,
    "system": 150,
    "position": 8,
    "type": "planet"
  },
  "mission_type": "transport",
  "ships": {
    "small_cargo": 10,
    "large_cargo": 5
  },
  "resources": {
    "metal": 10000,
    "crystal": 5000,
    "deuterium": 1000
  },
  "speed_percent": 100
}

// Response
{
  "success": true,
  "message": "Fleet dispatched on transport mission",
  "mission": {
    "id": "uuid",
    "mission_type": "transport",
    "destination": "[1:150:8]",
    "arrives_at": "2024-01-13T14:00:00Z",
    "duration_seconds": 7200,
    "fuel_consumption": 500
  }
}`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* Galaxy */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Galaxy</div>
            <div className="ogame-panel-content">
              <h3 className="text-ogame-text-header font-semibold mb-2">GET /api/v1/galaxy?galaxy=1&system=100</h3>
              <p className="text-ogame-text-muted mb-4">
                View a solar system and see all planets, players, and debris fields.
              </p>
              <div className="bg-[#0a0f14] p-4 rounded-sm">
                <pre className="text-sm overflow-x-auto">
{`// Response
{
  "coordinates": { "galaxy": 1, "system": 100 },
  "positions": [
    {
      "position": 1,
      "planet": null,
      "moon": null,
      "debris": null
    },
    {
      "position": 7,
      "planet": {
        "id": "uuid",
        "name": "Homeworld",
        "type": "planet",
        "player": {
          "id": "uuid",
          "username": "PlayerName",
          "is_self": true
        }
      },
      "moon": null,
      "debris": { "metal": 1000, "crystal": 500 }
    },
    ...
  ]
}`}
                </pre>
              </div>
            </div>
          </section>

          {/* Building IDs */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Building IDs Reference</div>
            <div className="ogame-panel-content">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-ogame-text-header font-semibold mb-2">Resources</h4>
                  <ul className="text-ogame-text-muted space-y-1">
                    <li>1 - Metal Mine</li>
                    <li>2 - Crystal Mine</li>
                    <li>3 - Deuterium Synthesizer</li>
                    <li>4 - Solar Plant</li>
                    <li>5 - Fusion Plant</li>
                    <li>6 - Metal Storage</li>
                    <li>7 - Crystal Storage</li>
                    <li>8 - Deuterium Tank</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-ogame-text-header font-semibold mb-2">Facilities</h4>
                  <ul className="text-ogame-text-muted space-y-1">
                    <li>9 - Robot Factory</li>
                    <li>10 - Nanite Factory</li>
                    <li>11 - Shipyard</li>
                    <li>12 - Research Lab</li>
                    <li>13 - Terraformer</li>
                    <li>14 - Alliance Depot</li>
                    <li>15 - Missile Silo</li>
                    <li>16 - Space Dock</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Ship Keys */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Ship Keys Reference</div>
            <div className="ogame-panel-content">
              <div className="grid grid-cols-3 gap-4 text-sm text-ogame-text-muted">
                <ul className="space-y-1">
                  <li>light_fighter</li>
                  <li>heavy_fighter</li>
                  <li>cruiser</li>
                  <li>battleship</li>
                  <li>battlecruiser</li>
                  <li>bomber</li>
                </ul>
                <ul className="space-y-1">
                  <li>destroyer</li>
                  <li>deathstar</li>
                  <li>small_cargo</li>
                  <li>large_cargo</li>
                  <li>colony_ship</li>
                  <li>recycler</li>
                </ul>
                <ul className="space-y-1">
                  <li>espionage_probe</li>
                  <li>solar_satellite</li>
                  <li>crawler</li>
                  <li>reaper</li>
                  <li>pathfinder</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Mission Types */}
          <section className="ogame-panel">
            <div className="ogame-panel-header">Mission Types Reference</div>
            <div className="ogame-panel-content">
              <ul className="text-sm text-ogame-text-muted space-y-1">
                <li><code className="text-ogame-accent">attack</code> - Attack an enemy planet</li>
                <li><code className="text-ogame-accent">transport</code> - Transport resources to another planet</li>
                <li><code className="text-ogame-accent">deployment</code> - Station fleet at your own planet</li>
                <li><code className="text-ogame-accent">espionage</code> - Spy on an enemy planet</li>
                <li><code className="text-ogame-accent">colonization</code> - Colonize an empty position</li>
                <li><code className="text-ogame-accent">recycle</code> - Collect debris field</li>
                <li><code className="text-ogame-accent">expedition</code> - Send fleet to position 16 for exploration</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
