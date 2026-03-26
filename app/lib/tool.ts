import { attractions } from "@/data/attractions.json";
import { accommodations } from "@/data/accommodations.json";
import { main_route, local_transport } from "@/data/transportations.json";
import { restaurants } from "@/data/restaurants.json";

import { z } from "zod";
import { FinancialSummarySchema, SchedulerOutputSchema } from "./state";


export function searchAttractions({ province, tags }: { province: string; tags: string[] }) {
    if (tags.length === 0) {
        return attractions.filter(attraction => attraction.province.toLowerCase() === province.toLowerCase());
    }

    return attractions.filter(attraction =>
        attraction.tags.some(tag => tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) && attraction.province.toLowerCase() === province.toLowerCase()
    );
}

export function searchAccommodations({ amenities }: { amenities: string[] }) {
    if (amenities.length === 0) {
        return accommodations;
    }
    return accommodations.filter(accommodation =>
        accommodation.amenities.some(amenity => amenities.map(a => a.toLowerCase()).includes(amenity.toLowerCase()))
    );
}

export function searchMainTransportation({ type }: { type: string | null }) { // type can be "bus", "train", "flight", etc.
    if (!type) {
        return main_route;
    }
    return main_route.filter(transport => transport.type.toLowerCase() === type.toLowerCase());
}

export function searchLocalTransportation({ type }: { type: string | null }) {
    if (!type) {
        return local_transport;
    }
    return local_transport.filter(transport => transport.type.toLowerCase() === type.toLowerCase());
}

export function searchRestaurants({ province, tags }: { province: string; tags: string[] }) {
    if (tags.length === 0) {
        return restaurants.filter(restaurant => restaurant.province.toLowerCase() === province.toLowerCase());
    }

    return restaurants.filter(restaurant =>
        restaurant.tags.some(tag => tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) && restaurant.province.toLowerCase() === province.toLowerCase()
    );
}

export function calculateCosts(budget: number, plan: z.infer<typeof SchedulerOutputSchema>) {
    const accommodation_cost = plan.accommodation.reduce((sum, room) => sum + room.total_cost, 0);

    const main_transport_cost =
        (plan.main_transportation.outbound?.cost ?? 0) +
        (plan.main_transportation.inbound?.cost ?? 0);

    let local_transport_cost = 0;
    let food_cost = 0;
    let activity_cost = 0;

    for (const dayPlan of plan.daily_plans) {
        for (const activity of dayPlan.activities) {
            const cost = activity.cost ?? 0;

            if (activity.activity_type === "local_transport") {
                local_transport_cost += cost;
            } else if (activity.activity_type === "restaurant") {
                food_cost += cost;
            } else {
                activity_cost += cost;
            }
        }
    }

    const total_actual_cost =
        accommodation_cost +
        main_transport_cost +
        local_transport_cost +
        food_cost +
        activity_cost;

    const requested_budget = budget;
    const remaining_budget = requested_budget - total_actual_cost;

    return FinancialSummarySchema.parse({
        requested_budget,
        accommodation_cost,
        main_transport_cost,
        local_transport_cost,
        food_cost,
        activity_cost,
        total_actual_cost,
        remaining_budget,
    });
}