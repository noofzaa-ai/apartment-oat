import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/apartments/[id]
 * Get apartment detail by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const apartmentId = parseInt(id);

    if (isNaN(apartmentId)) {
      return NextResponse.json(
        { error: "invalid_apartment_id" },
        { status: 400 }
      );
    }

    const apartment = await prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: {
        id: true,
        name: true,
        address: true,
        createdAt: true,
        User: {
          select: {
            id: true,
            displayName: true,
            email: true,
            role: true,
            status: true,
            Subscription: {
              select: {
                id: true,
                planCode: true,
                status: true,
                billingCycle: true,
                currentPeriodStart: true,
                currentPeriodEnd: true,
                trialEndsAt: true,
                Plan: {
                  select: {
                    displayName: true,
                    pricePerRoom: true,
                  },
                },
              },
            },
          },
        },
        Room: {
          select: {
            id: true,
            roomNumber: true,
            roomType: true,
            baseRent: true,
            Membership: {
              select: {
                id: true,
                userId: true,
                role: true,
                createdAt: true,
                User: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { roomNumber: "asc" },
        },
      },
    });

    if (!apartment) {
      return NextResponse.json(
        { error: "apartment_not_found" },
        { status: 404 }
      );
    }

    // Format response
    const formattedApartment = {
      id: apartment.id,
      name: apartment.name,
      address: apartment.address,
      createdAt: apartment.createdAt,
      owner: {
        id: apartment.User.id,
        displayName: apartment.User.displayName,
        email: apartment.User.email,
        role: apartment.User.role,
        status: apartment.User.status,
      },
      subscription: apartment.User.Subscription
        ? {
            id: apartment.User.Subscription.id,
            planCode: apartment.User.Subscription.planCode,
            planName: apartment.User.Subscription.Plan.displayName,
            status: apartment.User.Subscription.status,
            billingCycle: apartment.User.Subscription.billingCycle,
            currentPeriodStart: apartment.User.Subscription.currentPeriodStart,
            currentPeriodEnd: apartment.User.Subscription.currentPeriodEnd,
            trialEndsAt: apartment.User.Subscription.trialEndsAt,
            pricePerRoom: apartment.User.Subscription.Plan.pricePerRoom,
          }
        : null,
      rooms: apartment.Room.map((room) => ({
        id: room.id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        baseRent: room.baseRent,
        tenant: room.Membership
          ? {
              membershipId: room.Membership.id,
              userId: room.Membership.User.id,
              displayName: room.Membership.User.displayName,
              email: room.Membership.User.email,
              role: room.Membership.role,
              joinedAt: room.Membership.createdAt,
            }
          : null,
      })),
    };

    return NextResponse.json({
      apartment: formattedApartment,
    });
  } catch (error) {
    if (error instanceof NextResponse) {
      return error;
    }
    console.error("GET /api/admin/apartments/[id] error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
