Feature: Manage Notifications in Portal
As a user of OctaiPipe platform
I want to manage (create, view, update, delete) notifications from the Portal UI
So that I can be informed about important events and updates

  # Background:
    # Given Padawan is logged in

  @TEST_IT-154 @TESTSET_OCTA3-484 @NOTIFICATIONS @DEFAULT_EMAIL
  Scenario: Manually trigger the Default Email notification
    When Padawan sends "Default Email" notification to "Nick.Tulett@octaipipe.ai"
      | field   | value                             |
      | subject | System Update Alert               |
      | message | A new system update is available. |
    Then Padawan sees the "Default Email" notification in the feed

  @TEST_IT-155 @TESTSET_OCTA3-484 @NOTIFICATIONS @HTML_EMAIL
  Scenario: Manually trigger HTML Email notification
    When Padawan sends "Example: HTML Email" notification to "Nick.Tulett@octaipipe.ai"
      | field                | value                           |
      | brand.address        |         123 Acme St, Metropolis |
      | brand.name           | Acme                            |
      | devices.dropoutRate  |                               5 |
      | devices.expected     |                             100 |
      | devices.reporting    |                              95 |
      | fl.aggregation       | Sum                             |
      | fl.cohort            | A                               |
      | fl.round             |                               5 |
      | fl.totalRounds       |                              10 |
      | links.cohortUrl      | http://octaipipe.ai/cohorts/A   |
      | links.runUrl         | http://octaipipe.ai/runs/260122 |
      | links.unsubscribeUrl | http://octaipipe.ai/unsubscribe |
      | placeholders         | Test Placeholders               |
      | recipient.name       | John Doe                        |
      | recipient.reason     | Monthly Report                  |
      | report.generatedAt   |            2024-01-26T10:00:00Z |
      | report.headline      | Report Summary                  |
      | report.title         | Very Important Report           |
      | run.id               |                          260122 |
      | run.pipelineName     | Data Processing Pipeline        |
      | run.stage            | Data Ingestion                  |
      | data.metrics.name    | Test Data Item                  |
      | data.metrics.note    | This is a test note.            |
      | data.metrics.value   |                              42 |
    Then Padawan sees the "Example: HTML Email" notification in the feed

  @TEST_IT-157 @TESTSET_OCTA3-484 @NOTIFICATIONS @TEAMS
  Scenario: Manually trigger Teams notification
    When Padawan sends "Example: Teams Notification" notification to "https://default9485acfba3484a748408be47f710df.4b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/3b41d47df78e43ada62bf3e823e8f7e6/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=jY55xTdWK8_aZce6OIJpB4Wcy8f5-ZYULhrUlto-1SY"
      | field                     | value                            |
      | alert.detectedAt          |             2026-01-22T16:00:00Z |
      | alert.id                  |                             1234 |
      | alert.severity            | Clusterfeck                      |
      | alert.summary             | We're all doomed!                |
      | alert.title               | Panic!                           |
      | devices.dropoutRate       |                               24 |
      | devices.expected          |                              200 |
      | devices.reporting         |                              154 |
      | devices.transport         | Inverse Reactive Current         |
      | fl.aggregation            | Panand Dermic                    |
      | fl.clientSelection        | Phase Detractor                  |
      | fl.cohort                 | Cardinal Grammars                |
      | fl.round                  | Magneto Reluctance               |
      | fl.secureAggregation      | Capacative Dant                  |
      | fl.totalRounds            |                              999 |
      | links.cohortUrl           | http://octaipipe.ai/teams-cohort |
      | links.runUrl              | http://octaipipe.ai/teams-run    |
      | model.name                | Turbo Encabulator                |
      | model.version             |                            3.2.1 |
      | run.id                    |                             7654 |
      | run.pipelineName          | Semi Bolid Slator                |
      | run.stage                 | Differential Girdle Spring       |
      | signals.aggregationHealth | Flourescent                      |
      | signals.clientFailures    |                             4567 |
    Then Padawan sees the "Example: Teams Notification" notification in the feed

  @TEST_IT-515 @TESTSET_OCTA3-484 @NOTIFICATIONS @CONFIG
  Scenario: Create Notification Configuration
    Given Padawan creates a new "qa-email.html" configuration to be sent to "nick.tulett@octaipipe.ai"
      | field        | value                    |
      | Name         | QA HTML Email            |
      | Description  | Template for E2E testing |
      | Type         | Email                    |
      | Content Type | HTML                     |
    When Padawan sends "QA HTML Email" notification
      | field              | value                |
      | brand.name         | OctaiPipe            |
      | report.generatedAt | 2026-01-26T14:00:00Z |
      | report.title       | Very QA Report       |
    Then Padawan sees the "QA HTML Email" notification in the feed
