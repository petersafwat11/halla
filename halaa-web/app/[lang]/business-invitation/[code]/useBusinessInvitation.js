'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGuestByToken, useGuestMutation } from '@/hooks/guests';
import { guestsKeys } from '@/hooks/guests/keys';

const unwrap = (data) => data?.data || data || {};
const fieldsFrom = (guest) => ({
  message: guest?.rsvp?.message || '',
  dietaryRestrictions: guest?.rsvp?.dietaryRestrictions || '',
  plusOnes: guest?.rsvp?.plusOnes || 0,
});

export default function useBusinessInvitation(code, language) {
  const query = useGuestByToken(code, { retry: 1, language });
  const mutation = useGuestMutation('rsvp');
  const queryClient = useQueryClient();
  const payload = unwrap(query.data);
  const { guest } = payload;
  const [fields, setFields] = useState(fieldsFrom());
  const [changing, setChanging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);
  const statusRef = useRef(null);
  const formRef = useRef(null);
  const initializedGuest = useRef(null);
  const guestKey = guest ? `${code}:${guest.id}` : null;

  useEffect(() => {
    if (!guest || initializedGuest.current === guestKey) return;
    initializedGuest.current = guestKey;
    setFields(fieldsFrom(guest));
    setChanging(false);
    setFailed(false);
    // Initialize once per invitation; background reads preserve unsaved drafts.
  }, [guest, guestKey]);

  function changeResponse() {
    if (inFlight.current) return;
    setFields(fieldsFrom(guest));
    setFailed(false);
    setChanging(true);
  }

  useEffect(() => {
    if (changing) formRef.current?.querySelector('textarea')?.focus();
  }, [changing]);

  async function respond(response) {
    if (inFlight.current || !formRef.current?.reportValidity()) return;
    inFlight.current = true;
    setSaving(true);
    setFailed(false);
    const submitted = { ...fields };
    let accepted = false;
    try {
      const result = unwrap(
        await mutation.mutateAsync({
          id: guest.id,
          token: code,
          response,
          data: {
            ...submitted,
            invitationCode: code,
            revision: guest.revision,
            lang: language,
          },
        }),
      );
      const refreshed = await query.refetch();
      if (refreshed.isError) {
        // The write remains authoritative if the follow-up read fails.
        queryClient.setQueryData([...guestsKeys.byToken(code), language], {
          ...payload,
          ...result,
          pass: result.pass || null,
        });
      }
      accepted = true;
    } catch {
      // Verify an uncertain write against current state, never its error code.
      const refreshed = await query.refetch();
      const saved = unwrap(refreshed.data).guest?.rsvp;
      accepted =
        !refreshed.isError &&
        saved?.response === response &&
        (saved.message || '') === submitted.message &&
        (saved.dietaryRestrictions || '') === submitted.dietaryRestrictions &&
        (saved.plusOnes || 0) === submitted.plusOnes;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
    if (accepted) {
      setChanging(false);
      requestAnimationFrame(() => statusRef.current?.focus());
    } else setFailed(true);
  }

  return {
    query,
    payload,
    fields,
    changing,
    saving,
    failed,
    statusRef,
    formRef,
    respond,
    changeResponse,
    cancelChange: () => {
      setChanging(false);
      setFailed(false);
    },
    setField: (name, value) =>
      setFields((current) => ({ ...current, [name]: value })),
  };
}
