import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";
import toast from "react-hot-toast";
import axios from "axios";
import { RefreshCw, Save, Camera, Square, Wifi, WifiOff } from "lucide-react";

const PYTHON_URL = process.env.REACT_APP_PYTHON_URL || "http://localhost:5001";

const py = {
  start: (body) => axios.post(`${PYTHON_URL}/api/face/start`, body),
  stop: () => axios.post(`${PYTHON_URL}/api/face/stop`),
  status: () => axios.get(`${PYTHON_URL}/api/face/status`),
  health: () => axios.get(`${PYTHON_URL}/api/face/health`),
};

const STATUS_OPTS = ["Present", "Absent", "Late"];

export default function MarkAttendance() {
  const [searchParams] = useSearchParams();
  const [subjects, setSubjects] = useState([]);
  const [selSub, setSelSub] = useState(searchParams.get("subject") || "");
  const [date, setDate] = useState(
    searchParams.get("date") || new Date().toISOString().split("T")[0],
  );

  const [classData, setClassData] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [loadingClass, setLoadingClass] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pyOnline, setPyOnline] = useState(true);
  const [frRunning, setFrRunning] = useState(false);
  const [frMessage, setFrMessage] = useState("Ready");
  const [frMarked, setFrMarked] = useState([]);
  const [liveFrame, setLiveFrame] = useState(null);

  const pollRef = useRef(null);
  const { user } = (() => {
    try {
      return require("../../context/AuthContext").useAuth();
    } catch {
      return { user: {} };
    }
  })();

  // Load Subjects
  useEffect(() => {
    api.getTeacherSubjects().then((r) => {
      setSubjects(r.data || []);
      if (!selSub && r.data?.length) setSelSub(r.data[0].id);
    });
  }, []);

  // Load Class
  const loadClass = useCallback(() => {
    if (!selSub) return;
    setLoadingClass(true);
    setOverrides({});
    api
      .getClassAttendance(selSub, date)
      .then((r) => setClassData(r.data))
      .catch(() => toast.error("Failed to load class"))
      .finally(() => setLoadingClass(false));
  }, [selSub, date]);

  useEffect(() => {
    loadClass();
  }, [loadClass]);

  // Polling for Face Recognition
  const startPolling = () => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await py.status();
        setFrMessage(data.message || "Running...");
        setFrRunning(data.running || false);
        if (data.frame_b64) setLiveFrame(data.frame_b64);
        if (data.marked?.length) {
          setFrMarked(data.marked);
        }
      } catch (err) {
        console.warn("Polling failed", err);
      }
    }, 800);
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  // Start Session
  const handleStartFR = async () => {
    if (!selSub) return toast.error("Select a subject first");

    const sub = subjects.find((s) => s.id === selSub);
    if (!sub) return toast.error("Subject not found");

    try {
      await py.start({
        subject_id: selSub,
        subject_name: sub.name,
        subject_code: sub.code,
        date,
        teacher_id: user?.id || "teacher",
      });

      setFrRunning(true);
      setFrMarked([]);
      setLiveFrame(null);
      setFrMessage("Session started - Waiting for sensor trigger...");
      startPolling();
      toast.success("Face recognition started! Trigger the sensor now.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start session");
    }
  };

  // Stop Session + Auto Save
  const handleStopFR = async () => {
    stopPolling();
    try {
      await py.stop();
    } catch {}

    if (frMarked.length > 0 && selSub && date) {
      const recordsToSave = frMarked.map((m) => ({
        student_id: m.studentId,
        name: m.name,
        studentId: m.rollNo || m.studentId,
        status: "Present",
      }));

      try {
        await api.bulkMark({
          subject_id: selSub,
          date,
          records: recordsToSave,
        });
        toast.success(`✅ Saved ${frMarked.length} students as Present`);
      } catch (err) {
        toast.error("Failed to save attendance");
      }
    }

    setFrRunning(false);
    setFrMessage("Session ended");
    setLiveFrame(null);
    loadClass();
  };

  const setStatus = (studentId, status) =>
    setOverrides((o) => ({ ...o, [studentId]: status }));
  const getEffective = (s) => overrides[s.id] || s.status;

  const handleSaveManual = async () => {
    if (!classData) return;
    const toSave = classData.students
      .map((s) => ({
        student_id: s.id,
        name: s.name,
        studentId: s.studentId,
        status: overrides[s.id],
      }))
      .filter((r) => r.status);

    if (!toSave.length) return toast.error("Nothing to save");

    setSaving(true);
    try {
      await api.bulkMark({ subject_id: selSub, date, records: toSave });
      toast.success(`Saved ${toSave.length} records`);
      loadClass();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const stats = classData
    ? {
        present: classData.students.filter((s) => getEffective(s) === "Present")
          .length,
        absent: classData.students.filter((s) => getEffective(s) === "Absent")
          .length,
        late: classData.students.filter((s) => getEffective(s) === "Late")
          .length,
        unmarked: classData.students.filter(
          (s) => getEffective(s) === "Not Marked",
        ).length,
      }
    : null;

  return (
    <div className="page slide-up">
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "Playfair Display,serif",
              fontSize: "1.8rem",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Mark Attendance
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.867rem",
              marginTop: 4,
            }}
          >
            Face recognition via ESP32 — Live camera feed enabled
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 20,
            background: pyOnline ? "var(--jade-bg)" : "var(--red-bg)",
            color: pyOnline ? "var(--jade2)" : "var(--red)",
          }}
        >
          {pyOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {pyOnline ? "Python service online" : "Python service offline"}
        </div>
      </div>

      {/* Controls */}
      <div
        className="card card-body"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
          alignItems: "flex-end",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ flex: "1 1 220px" }}>
          <label>Subject</label>
          <select
            className="select"
            value={selSub}
            onChange={(e) => setSelSub(e.target.value)}
          >
            <option value="">Select subject...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Date</label>
          <input
            type="date"
            className="input"
            style={{ width: 180 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary btn-sm" onClick={loadClass}>
            <RefreshCw size={13} /> Refresh
          </button>
          {!frRunning ? (
            <button
              className="btn btn-primary"
              onClick={handleStartFR}
              disabled={!selSub}
            >
              <Camera size={14} /> Start Session
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleStopFR}>
              <Square size={14} /> Stop Session
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveManual}
            disabled={saving}
          >
            {saving ? (
              <span className="spinner" />
            ) : (
              <>
                <Save size={13} /> Save Manual
              </>
            )}
          </button>
        </div>
      </div>

      {/* LIVE CAMERA FEED */}
      {frRunning && (
        <div
          className="card"
          style={{ marginBottom: "1.5rem", overflow: "hidden" }}
        >
          <div
            className="card-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600 }}>Live Camera Feed</span>
            <span style={{ fontSize: "0.85rem", color: "#1ec980" }}>
              {frMessage}
            </span>
          </div>

          <div
            style={{
              background: "#000",
              minHeight: 420,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {liveFrame ? (
              <img
                src={`data:image/jpeg;base64,${liveFrame}`}
                alt="Live Feed"
                style={{
                  maxWidth: "100%",
                  maxHeight: "420px",
                  objectFit: "contain",
                }}
              />
            ) : (
              <div style={{ color: "#666", textAlign: "center" }}>
                <Camera size={60} style={{ opacity: 0.4, marginBottom: 12 }} />
                <div>Waiting for sensor trigger...</div>
              </div>
            )}
          </div>

          {/* Sensor Values Display - NEW */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(30, 201, 128, 0.1)",
              borderTop: "1px solid rgba(30, 201, 128, 0.2)",
              fontSize: "0.85rem",
              color: "#1ec980",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            Real-time Sensor: <strong>{frMessage}</strong>
          </div>
        </div>
      )}

      {/* Summary */}
      {stats && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: "1rem",
            flexWrap: "wrap",
          }}
        >
          {[
            ["Present", "present", stats.present],
            ["Absent", "absent", stats.absent],
            ["Late", "late", stats.late],
            ["Unmarked", "neutral", stats.unmarked],
          ].map(([lbl, cls, val]) => (
            <span
              key={lbl}
              className={`badge badge-${cls}`}
              style={{ fontSize: "0.85rem", padding: "0.35rem 1rem" }}
            >
              {val} {lbl}
            </span>
          ))}
        </div>
      )}

      {/* Student Table */}
      {classData && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Roll No</th>
                <th>Status</th>
                <th>Override</th>
              </tr>
            </thead>
            <tbody>
              {classData.students.map((s, i) => {
                const effective = getEffective(s);
                const isAutoMarked = frMarked.some((m) => m.studentId === s.id);
                return (
                  <tr
                    key={s.id}
                    style={
                      isAutoMarked
                        ? { background: "rgba(22,160,107,0.08)" }
                        : {}
                    }
                  >
                    <td>{i + 1}</td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: isAutoMarked
                              ? "var(--jade-bg)"
                              : "var(--surface3)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            color: "var(--jade2)",
                          }}
                        >
                          {s.name[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.name}</div>
                          {isAutoMarked && (
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--jade2)",
                              }}
                            >
                              ✓ Auto-marked by face recognition
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "JetBrains Mono, monospace",
                          color: "var(--text-muted)",
                        }}
                      >
                        {s.studentId}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${effective.toLowerCase().replace(" ", "-")}`}
                      >
                        {effective}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {STATUS_OPTS.map((st) => (
                          <button
                            key={st}
                            onClick={() => setStatus(s.id, st)}
                            className="btn btn-sm"
                            style={{
                              background:
                                effective === st
                                  ? "var(--jade-bg)"
                                  : "var(--surface2)",
                              color:
                                effective === st
                                  ? "var(--jade2)"
                                  : "var(--text-muted)",
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
