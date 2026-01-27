/**
 * Divorce With Children Orchestrator Tests
 * 
 * Tests for the 4 fixes:
 * Fix #1: Cohabitation / date_of_separation conditional
 * Fix #2: Reconciliation question capture
 * Fix #3: Children vs Child Details step semantics
 * Fix #4: Progress rail status (consequence of Fix #3)
 */

import { describe, it, expect } from 'vitest';
import { orchestrateDivorceWithChildrenIntake } from '../core/divorce_with_children.orchestrator';
import { buildSidebarSteps } from '../registry';

describe('Divorce With Children Orchestrator', () => {
    // =========================================================================
    // Fix #1: Cohabitation / date_of_separation conditional
    // =========================================================================
    describe('Fix #1: Cohabitation Conditional', () => {
        it('should NOT require date_of_separation when currently_cohabitating=true', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true, // Living together - no separation date needed
            });

            // Should be on separation_grounds, NOT stuck on marriage_details for date_of_separation
            const marriageStep = result.schemaSteps.find(s => s.key === 'marriage_details');
            expect(marriageStep?.missingFields).not.toContain('date_of_separation');
            expect(marriageStep?.status).toBe('complete');
        });

        it('should REQUIRE date_of_separation when currently_cohabitating=false', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: false, // Separated - date required
            });

            const marriageStep = result.schemaSteps.find(s => s.key === 'marriage_details');
            expect(marriageStep?.missingFields).toContain('date_of_separation');
            expect(result.currentSchemaStep).toBe('marriage_details');
        });
    });

    // =========================================================================
    // Fix #1b: Spouse Address Same-as-Client Conditional
    // =========================================================================
    describe('Fix #1b: Spouse Address Same-as-Client', () => {
        it('should NOT require opposing_address_known when opposing_address_same_as_client=true', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true, // Lives at same address
                service_concerns: 'none',
            });

            // Should NOT be stuck on opposing_party for opposing_address_known
            const opposingStep = result.schemaSteps.find(s => s.key === 'opposing_party');
            expect(opposingStep?.missingFields).not.toContain('opposing_address_known');
            expect(opposingStep?.status).toBe('complete');
        });

        it('should REQUIRE opposing_address_known when opposing_address_same_as_client=false', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: false, // Lives at different address
                service_concerns: 'none',
            });

            // Should be stuck on opposing_party for opposing_address_known
            const opposingStep = result.schemaSteps.find(s => s.key === 'opposing_party');
            expect(opposingStep?.missingFields).toContain('opposing_address_known');
            expect(result.currentSchemaStep).toBe('opposing_party');
        });

        it('should REQUIRE opposing_last_known_address when different address AND address is known', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: false,
                opposing_address_known: true, // Knows address but hasn't provided it
                service_concerns: 'none',
            });

            // Should require the actual address
            const opposingStep = result.schemaSteps.find(s => s.key === 'opposing_party');
            expect(opposingStep?.missingFields).toContain('opposing_last_known_address');
            expect(result.currentSchemaStep).toBe('opposing_party');
        });
    });

    // =========================================================================
    // Fix #2: Reconciliation question capture
    // =========================================================================
    describe('Fix #2: Reconciliation Question', () => {
        it('should require reconciliation_attempted before advancing from separation_grounds', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true,
                grounds_for_divorce: 'irreconcilable',
                // Missing: reconciliation_attempted
            });

            expect(result.currentSchemaStep).toBe('separation_grounds');
            expect(result.currentStepMissingFields).toContain('reconciliation_attempted');
        });

        it('should advance to children_gate when reconciliation_attempted is provided', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true,
                grounds_for_divorce: 'irreconcilable',
                reconciliation_attempted: false, // Now provided
            });

            expect(result.currentSchemaStep).toBe('children_gate');
        });
    });

    // =========================================================================
    // Fix #3: Children vs Child Details step semantics
    // =========================================================================
    describe('Fix #3: Children Step Semantics', () => {
        it('should complete children_gate when seed fields are provided (name, dob, residence)', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true,
                grounds_for_divorce: 'irreconcilable',
                reconciliation_attempted: false,
                has_minor_children: true,
                children_count: 1,
                // Seed fields provided
                child_full_name: ['Teddy Smith'],
                child_dob: ['2020-01-01'],
                child_current_residence: ['with_client'],
                // Detail fields missing
            });

            // children_gate should be complete
            expect(result.completedSchemaSteps).toContain('children_gate');
            // Should now be on child_object for detail fields
            expect(result.currentSchemaStep).toBe('child_object');
        });

        it('should require detail fields in child_object step', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true,
                grounds_for_divorce: 'irreconcilable',
                reconciliation_attempted: false,
                has_minor_children: true,
                children_count: 1,
                child_full_name: ['Teddy Smith'],
                child_dob: ['2020-01-01'],
                child_current_residence: ['with_client'],
            });

            const childObjectStep = result.schemaSteps.find(s => s.key === 'child_object');
            // Should show missing detail fields
            expect(childObjectStep?.missingFields.some(f => f.includes('biological_relation'))).toBe(true);
            expect(childObjectStep?.missingFields.some(f => f.includes('child_home_state'))).toBe(true);
            expect(childObjectStep?.missingFields.some(f => f.includes('time_in_home_state_months'))).toBe(true);
        });

        it('should advance to custody_preferences when all child fields are complete', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true,
                grounds_for_divorce: 'irreconcilable',
                reconciliation_attempted: false,
                has_minor_children: true,
                children_count: 1,
                // All seed fields
                child_full_name: ['Teddy Smith'],
                child_dob: ['2020-01-01'],
                child_current_residence: ['with_client'],
                // All detail fields
                biological_relation: ['biological'],
                child_home_state: ['Georgia'],
                time_in_home_state_months: [24],
            });

            // Both children steps should be complete
            expect(result.completedSchemaSteps).toContain('children_gate');
            expect(result.completedSchemaSteps).toContain('child_object');
            // Should advance to custody_preferences
            expect(result.currentSchemaStep).toBe('custody_preferences');
        });
    });

    // =========================================================================
    // Fix #4: Progress rail status
    // =========================================================================
    describe('Fix #4: Progress Rail Status', () => {
        it('should show custody step as current when on custody_preferences', () => {
            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true,
                grounds_for_divorce: 'irreconcilable',
                reconciliation_attempted: false,
                has_minor_children: true,
                children_count: 1,
                child_full_name: ['Teddy Smith'],
                child_dob: ['2020-01-01'],
                child_current_residence: ['with_client'],
                biological_relation: ['biological'],
                child_home_state: ['Georgia'],
                time_in_home_state_months: [24],
            });

            // Check UI steps
            const childrenGateUi = result.uiSteps.find(s => s.key === 'children_gate');
            const childDetailsUi = result.uiSteps.find(s => s.key === 'children_details');
            const custodyUi = result.uiSteps.find(s => s.key === 'custody');

            // Children steps should be complete
            expect(childrenGateUi?.status).toBe('complete');
            expect(childDetailsUi?.status).toBe('complete');
            // Custody should be current
            expect(custodyUi?.status).toBe('current');
        });
    });

    // =========================================================================
    // Fix #5: Registry Sidebar Step Building (Frontend Path)
    // =========================================================================
    describe('Fix #5: Registry Sidebar Building', () => {
        it('should build correct sidebar steps from orchestrator output', () => {

            const result = orchestrateDivorceWithChildrenIntake({
                urgency_level: 'standard',
                intake_channel: 'chat',
                client_first_name: 'Test',
                client_last_name: 'Client',
                client_dob: '1990-01-01',
                client_phone: '555-123-4567',
                client_email: 'test@example.com',
                client_address: '123 Main St, Atlanta, GA 30301',
                client_county: 'Fulton',
                opposing_first_name: 'Other',
                opposing_last_name: 'Party',
                opposing_address_same_as_client: true,
                service_concerns: 'none',
                date_of_marriage: '2015-06-15',
                place_of_marriage: 'Atlanta, GA',
                currently_cohabitating: true,
                grounds_for_divorce: 'irreconcilable',
                reconciliation_attempted: false,
                has_minor_children: true,
                children_count: 1,
                child_full_name: ['Teddy Smith'],
                child_dob: ['2020-01-01'],
                child_current_residence: ['with_client'],
                // Detail fields missing - should be on child_object
            });

            // Build stepStatus record from schemaSteps (same as load.ts does)
            const stepStatus = Object.fromEntries(
                result.schemaSteps.map((s) => [s.key, {
                    status: s.status,
                    missing: s.missingFields,
                    errors: s.validationErrors,
                }])
            );

            // Build sidebar steps (same as frontend does)
            const sidebarSteps = buildSidebarSteps(
                'divorce_with_children',
                result.currentSchemaStep,
                stepStatus
            );

            // Find Children and Child Details steps
            const childrenStep = sidebarSteps.find((s: { id: string }) => s.id === 'children_gate');
            const childDetailsStep = sidebarSteps.find((s: { id: string }) => s.id === 'children_details');
            const custodyStep = sidebarSteps.find((s: { id: string }) => s.id === 'custody');

            console.log('[Test] stepStatus children_gate:', stepStatus['children_gate']);
            console.log('[Test] stepStatus child_object:', stepStatus['child_object']);
            console.log('[Test] sidebarSteps Children:', childrenStep);
            console.log('[Test] sidebarSteps Child Details:', childDetailsStep);

            // Children step should be complete (seed fields provided)
            expect(childrenStep?.isCompleted).toBe(true);
            expect(childrenStep?.label).toBe('Children');

            // Child Details step should NOT be complete (detail fields missing)
            expect(childDetailsStep?.isCompleted).toBe(false);
            expect(childDetailsStep?.isActive).toBe(true); // Current step
            expect(childDetailsStep?.label).toBe('Child Details');

            // Custody should not be active yet
            expect(custodyStep?.isActive).toBe(false);
            expect(custodyStep?.isCompleted).toBe(false);
        });
    });
});
