import { attractions } from "@/data/attractions.json";
import { accommodations } from "@/data/accommodations.json";
import { main_route, local_transport } from "@/data/transportations.json";
import { restaurants } from "@/data/restaurants.json";


export function searchAttractions({ province, tags }: { province: string; tags: string[] }) {
    return attractions.filter(attraction =>
        attraction.tags.some(tag => tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()))
    );
}

export function searchAccommodations({ amenities }: { amenities: string[] }) {
    return accommodations.filter(accommodation =>
        accommodation.amenities.some(amenity => amenities.map(a => a.toLowerCase()).includes(amenity.toLowerCase()))
    );
}

export function searchMainTransportation({ type }: { type: string }) { // type can be "bus", "train", "flight", etc.
    return main_route.filter(transport => transport.type.toLowerCase() === type.toLowerCase());
}

export function searchLocalTransportation({ type }: { type: string }) {
    return local_transport.filter(transport => transport.type.toLowerCase() === type.toLowerCase());
}

export function searchRestaurants({ province, tags }: { province: string; tags: string[] }) {
    return restaurants.filter(restaurant =>
        restaurant.tags.some(tag => tags.map(t => t.toLowerCase()).includes(tag.toLowerCase())) && restaurant.province.toLowerCase() === province.toLowerCase()
    );
}

export function calculateCosts(exp: string) {
    return eval(exp);
}