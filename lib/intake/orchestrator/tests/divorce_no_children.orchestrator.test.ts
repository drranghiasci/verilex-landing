/**
 * Divorce No Children Orchestrator Tests
 * 
 * Tests for:
 * 1. unwrapValue helper with assertion wrappers
 * 2. hasValue with wrapped values
 * 3. Validators with wrapped assertion objects
 * 4. Step completion detection
 */

import { orchestrateDivorceNoChildrenIntake } from '../core/divorce_no_children.orchestrator';

// Mock assertion wrapper format
function wrapAssertion(value: unknown) {
    return {
        assertion_value: value,
        asserted_by: 'client',
        recorded_at: new Date().toISOString(),
        source_type: 'chat',
        contradiction_flag: false,
    };
}

describe('Divorce No Children Orchestrator', () => {
    describe('Step completion with wrapped assertions', () => {
        it('should mark client_identity as complete when all required fields are wrapped', () => {
            const payload = {
                client_first_name: wrapAssertion('John'),
                client_last_name: wrapAssertion('Doe'),
                client_dob: wrapAssertion('1990-01-01'),
                client_phone: wrapAssertion('4155551234'),
                client_email: wrapAssertion('john@example.com'),
                client_address: wrapAssertion({
                    street: '123 Main St',
                    city: 'Atlanta',
                    state: 'GA',
                    zip: '30305',
                }),
                client_county: wrapAssertion('Fulton'),
                urgency_level: wrapAssertion('standard'),
                intake_channel: wrapAssertion('web'),
            };

            const result = orchestrateDivorceNoChildrenIntake(payload);

            const clientIdentityStep = result.schemaSteps.find(s => s.key === 'client_identity');
            expect(clientIdentityStep).toBeDefined();
            expect(clientIdentityStep!.status).toBe('complete');
            expect(clientIdentityStep!.missingFields).toEqual([]);
            expect(clientIdentityStep!.validationErrors).toEqual([]);
        });

        it('should validate email correctly when wrapped', () => {
            const payload = {
                client_first_name: wrapAssertion('John'),
                client_last_name: wrapAssertion('Doe'),
                client_dob: wrapAssertion('1990-01-01'),
                client_phone: wrapAssertion('4155551234'),
                client_email: wrapAssertion('invalid-email'), // Invalid
                client_address: wrapAssertion({
                    street: '123 Main St',
                    city: 'Atlanta',
                    state: 'GA',
                    zip: '30305',
                }),
                client_county: wrapAssertion('Fulton'),
                urgency_level: wrapAssertion('standard'),
                intake_channel: wrapAssertion('web'),
            };

            const result = orchestrateDivorceNoChildrenIntake(payload);

            const clientIdentityStep = result.schemaSteps.find(s => s.key === 'client_identity');
            expect(clientIdentityStep).toBeDefined();
            expect(clientIdentityStep!.validationErrors.length).toBeGreaterThan(0);
            expect(clientIdentityStep!.validationErrors[0].field).toBe('client_email');
        });

        it('should validate phone correctly when wrapped', () => {
            const payload = {
                client_first_name: wrapAssertion('John'),
                client_last_name: wrapAssertion('Doe'),
                client_dob: wrapAssertion('1990-01-01'),
                client_phone: wrapAssertion('123'), // Invalid - too short
                client_email: wrapAssertion('john@example.com'),
                client_address: wrapAssertion({
                    street: '123 Main St',
                    city: 'Atlanta',
                    state: 'GA',
                    zip: '30305',
                }),
                client_county: wrapAssertion('Fulton'),
                urgency_level: wrapAssertion('standard'),
                intake_channel: wrapAssertion('web'),
            };

            const result = orchestrateDivorceNoChildrenIntake(payload);

            const clientIdentityStep = result.schemaSteps.find(s => s.key === 'client_identity');
            expect(clientIdentityStep).toBeDefined();
            expect(clientIdentityStep!.validationErrors.length).toBeGreaterThan(0);
            expect(clientIdentityStep!.validationErrors[0].field).toBe('client_phone');
        });

        it('should validate ZIP code correctly when wrapped', () => {
            const payload = {
                client_first_name: wrapAssertion('John'),
                client_last_name: wrapAssertion('Doe'),
                client_dob: wrapAssertion('1990-01-01'),
                client_phone: wrapAssertion('4155551234'),
                client_email: wrapAssertion('john@example.com'),
                client_address: wrapAssertion({
                    street: '123 Main St',
                    city: 'Atlanta',
                    state: 'GA',
                    zip: '123', // Invalid ZIP
                }),
                client_county: wrapAssertion('Fulton'),
                urgency_level: wrapAssertion('standard'),
                intake_channel: wrapAssertion('web'),
            };

            const result = orchestrateDivorceNoChildrenIntake(payload);

            const clientIdentityStep = result.schemaSteps.find(s => s.key === 'client_identity');
            expect(clientIdentityStep).toBeDefined();
            expect(clientIdentityStep!.validationErrors.length).toBeGreaterThan(0);
            expect(clientIdentityStep!.validationErrors[0].field).toBe('client_address');
        });
    });

    describe('Step progression', () => {
        it('should set current step to opposing_party after client_identity is complete', () => {
            const payload = {
                client_first_name: wrapAssertion('John'),
                client_last_name: wrapAssertion('Doe'),
                client_dob: wrapAssertion('1990-01-01'),
                client_phone: wrapAssertion('4155551234'),
                client_email: wrapAssertion('john@example.com'),
                client_address: wrapAssertion({
                    street: '123 Main St',
                    city: 'Atlanta',
                    state: 'GA',
                    zip: '30305',
                }),
                client_county: wrapAssertion('Fulton'),
                urgency_level: wrapAssertion('standard'),
                intake_channel: wrapAssertion('web'),
            };

            const result = orchestrateDivorceNoChildrenIntake(payload);

            expect(result.currentSchemaStep).toBe('opposing_party');
        });

        it('should NOT set final_review as complete until all steps are done', () => {
            const payload = {
                urgency_level: wrapAssertion('standard'),
                intake_channel: wrapAssertion('web'),
            };

            const result = orchestrateDivorceNoChildrenIntake(payload);

            const finalReview = result.schemaSteps.find(s => s.key === 'final_review');
            expect(finalReview).toBeDefined();
            expect(finalReview!.status).toBe('incomplete');
            expect(result.readyForReview).toBe(false);
        });
    });
});
